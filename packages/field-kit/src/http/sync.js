import {
  allPass, anyPass, chain, complement, compose, defaultTo, filter as rFilter,
  insert, isNil, map, path, prop, reduce,
} from 'ramda';
import farm from '../farm';
import { asFlatArray } from '../utils/asArray';
import parseFilter from '../utils/parseFilter';

const isNotNil = complement(isNil);
const getIncludedIds = chain(compose(
  map(prop('id')),
  rFilter(isNotNil),
  defaultTo([]),
  chain(path(['data', 'included'])),
));
function getIncluded(data, fulfilled) {
  const ids = getIncludedIds(fulfilled);
  const included = data.filter(d => ids.includes(d.id));
  return included;
}

export const fetchEntities = (shortName, { cache, ...rest }) =>
  farm[shortName].fetch({ ...rest }).then((results) => {
    const { data, fulfilled, rejected } = results;
    const included = getIncluded(data, fulfilled);
    const entities = data.reduce((collection, remote) => {
      const i = collection.findIndex(ent => ent.id === remote.id);
      const merged = farm[shortName].merge(collection[i], remote);
      return insert(i, merged, collection);
    }, asFlatArray(cache));
    return {
      data: entities, included, fulfilled, rejected,
    };
  });

export const syncEntities = (shortName, options) =>
  fetchEntities(shortName, options).then((fetchResults) => {
    const { filter, files = {} } = options;
    const { data: mergedEntities } = fetchResults;
    const failedBundleNames = fetchResults.rejected.map(({ response = {} }) => {
      const { config: { url = '' } = {} } = response;
      const bundleName = url.split('?')[0].split('/').pop();
      return bundleName;
    });
    const predicate = allPass([
      parseFilter(filter),
      entity => failedBundleNames.every(b => b !== entity.type),
      anyPass([farm.meta.isUnsynced, e => e.id in files]),
    ]);
    const syncables = mergedEntities.filter(predicate);
    const withOptions = e => (e.id in files ? { files: files[e.id] } : {});
    const sendWithOptions = e => farm[shortName].send(e, withOptions(e));
    const sendRequests = syncables.map(sendWithOptions);
    const handleSendResults = reduce((result, { status, reason, value: remote }) => {
      // No need to destructure 'included', since there's no reason to modify it.
      const { data, fulfilled, rejected } = result;
      if (status === 'rejected') {
        return {
          ...result,
          rejected: [...rejected, reason],
        };
      }
      const i = syncables.findIndex(ent => ent.id === remote.id);
      const merged = farm[shortName].merge(syncables[i], remote);
      return {
        ...result,
        data: insert(i, merged, data),
        fulfilled: [...fulfilled, remote],
      };
    }, fetchResults);
    return Promise.allSettled(sendRequests).then(handleSendResults);
  });
