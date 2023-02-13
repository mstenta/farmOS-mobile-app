import { validate } from 'uuid';
import {
  compose, concat, is, map, mergeDeepWith, pick, uniq,
} from 'ramda';
import { syncEntities } from './sync';
import interceptor from './interceptor';
import { getRecords } from '../idb';
import { cacheEntity } from '../idb/cache';
import farm from '../farm';
import nomenclature from '../entities/nomenclature';
import { STATUS_IN_PROGRESS, updateStatus } from './connection';
import { alert } from '../warnings/alert';
import { asFlatArray } from '../utils/asArray';
import parseFilter from '../utils/parseFilter';
import { loadFilesByHostId } from '../idb/files';

// An array of shortNames to ensure only valid entities are pushed onto the scheduler.
const entities = Object.keys(nomenclature.entities);

const stringifyID = (entity, type, id) => JSON.stringify({ entity, type, id });
const parseID = string => JSON.parse(string);
const FILTER_ID = 'FILTER_ID';

const makeNewGroup = type => ({
  id: null, type, files: null, filter: null,
});
function groupFilters(pendingIdStrings, pendingFilters, pendingFiles) {
  const groupMap = new Map();
  pendingIdStrings.forEach((idString) => {
    const { type, id } = parseID(idString);
    const group = groupMap.get(type) || makeNewGroup(type);
    if (id === FILTER_ID && pendingFilters.has(idString)) {
      // If the idString corresponds to a pending filter...
      const filter = pendingFilters.get(idString) || {};
      if (!filter.type) filter.type = type;
      // ...either concatenate it onto the group filter,
      if (is(Object, group.filter)) {
        group.filter = asFlatArray(group.filter);
        group.filter.push(filter);
      // ...or set it to the group filter if none exists.
      } else group.filter = filter;
    // If there's no pending filter, and the id is valid...
    } else if (validate(id)) {
      // ...either set the group id, if none exists,
      if (!group.id) group.id = id;
      // ...or concatenate it onto a list of ids that will be combined into a
      // separate filter at the very end.
      else {
        group.id = asFlatArray(group.id);
        group.id.push(id);
      }
    }
    const concatUniq = compose(uniq, concat);
    const mergeIdentifiers = mergeDeepWith(concatUniq);
    const fileIdentifiers = pendingFiles.get(idString);
    if (is(Object, fileIdentifiers) && validate(id)) {
      const files = { [id]: pendingFiles.get(idString) };
      group.files = mergeIdentifiers(group.files || {}, files);
    }
    groupMap.set(type, group);
  });
  // Iterate through the ESM Map, add the id's as a separate filter, and then
  // return a plain, flat array.
  const groups = Array.from(groupMap.values()).map((group) => {
    const { id, type, files } = group;
    let { filter } = group;
    if (validate(id) || Array.isArray(id)) {
      filter = asFlatArray(filter);
      filter.push({ id, type });
    }
    if (!filter) filter = { type };
    return { type, files, filter };
  });
  return groups;
}

// Utility for safely calling listeners and callbacks w/o worrying about exceptions.
const safeCall = (callback, ...args) => {
  try {
    callback(...args);
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
  }
};

// By default, the interval doubles after each attempt (geometric backoff),
// until the seventh attempt, at which the interval becomes and remains 5 min.
const defaultIntervals = [
  5000, // 0:05
  10000, // 0:10
  20000, // 0:20
  40000, // 0:40
  80000, // 1:20
  160000, // 2:40
  300000, // 5:00
];

export default function SyncScheduler(intervals = defaultIntervals) {
  const pending = new Set();
  const listeners = new Map();
  const pendingFilters = new Map();
  const pendingFiles = new Map();

  async function retry() {
    const retrying = new Set(pending);
    pending.clear();
    const retryingFilters = new Map(pendingFilters);
    pendingFilters.clear();
    const filterGroups = groupFilters(retrying, retryingFilters, pendingFiles);
    const requests = filterGroups.map(async (group) => {
      updateStatus(STATUS_IN_PROGRESS);
      const { type, filter } = group;
      const [entity] = type.split('--');
      const { shortName } = nomenclature.entities[entity];
      const syncOptions = {
        cache: await getRecords('entities', entity, parseFilter(filter)),
        files: await loadFilesByHostId(group.files || {}),
        filter,
      };
      const results = await syncEntities(shortName, syncOptions);
      const handler = ({ connectivity, warnings }) => {
        updateStatus(connectivity);
        if (warnings.length > 0) {
          alert(warnings);
        }
      };
      const { data } = interceptor(handler, results);
      data.forEach((value) => {
        const clearById = (retryList, idString) => {
          retryList.delete(idString);
          // Use optional chaining in case the exact id was never scheduled, or
          // an earlier retry already deleted it.
          listeners.get(idString)?.forEach((listener) => {
            safeCall(listener, value);
          });
          listeners.delete(idString);
        };
        if (!farm.meta.isUnsynced(value)) {
          const { id } = value;
          const idString = stringifyID(entity, type, id);
          clearById(retrying, idString);
          // Assume that if a value of a given type succeeds, any corresponding
          // filters with that same type also completed and can be cleared.
          const filterIdString = stringifyID(entity, type, FILTER_ID);
          clearById(retryingFilters, filterIdString);
        }
      });
      // Any entities that still haven't been synced are added back to pending.
      retrying.forEach((idString) => { pending.add(idString); });
      retryingFilters.forEach((idString) => { pendingFilters.add(idString); });
      const cacheRequests = data.map(value => cacheEntity(entity, value));
      return Promise.allSettled(cacheRequests);
    });
    return Promise.allSettled(requests);
  }

  function startClock(i = 0) {
    const interval = i < intervals.length
      ? intervals[i]
      : intervals[intervals.length - 1];
    setTimeout(() => {
      retry().finally(() => {
        if (pending.size > 0) {
          startClock(i + 1);
        }
      });
    }, interval);
  }

  this.push = function push(entity, type, target, options = {}) {
    if (!entities.includes(entity)) {
      throw new Error(`Invalid entity name: ${entity}`);
    }
    let idString;
    // The "target" can be a plain entity id...
    if (validate(target)) {
      idString = stringifyID(entity, type, target);
    }
    // ...or the "target" can be a filter object.
    if (is(Object, target)) {
      idString = stringifyID(entity, type, FILTER_ID);
      let filter = pendingFilters.get(idString);
      if (is(Object, filter)) filter = asFlatArray(filter).concat(target);
      else filter = target;
      pendingFilters.set(idString, filter);
    }
    // If the target is invalid, return false instead of a subscriber function.
    if (!idString) return false;
    if (is(Object, options.files)) {
      const fileIdentifiers = map(map(pick(['id', 'type'])), options.files);
      pendingFiles.set(idString, fileIdentifiers);
    }
    if (pending.size === 0) startClock();
    pending.add(idString);
    return function subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new Error(`Listener for ${type} ${entity} must be a function; `
          + `received '${typeof listener}'`);
      }
      let entityListeners = listeners.get(idString);
      if (!entityListeners) {
        entityListeners = [];
        listeners.set(idString, entityListeners);
      }
      entityListeners.push(listener);
    };
  };
}
