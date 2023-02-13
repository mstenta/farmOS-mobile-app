import {
  allPass, anyPass, insert, reduce,
} from 'ramda';
import farm from '../farm';
import { asFlatArray } from '../utils/asArray';
import parseFilter from '../utils/parseFilter';

export const fetchEntities = (shortName, { cache, filter, limit }) =>
  farm[shortName].fetch({ filter, limit }).then((results) => {
    const { data, fulfilled, rejected } = results;
    const entities = data.reduce((collection, remote) => {
      const i = collection.findIndex(ent => ent.id === remote.id);
      const merged = farm[shortName].merge(collection[i], remote);
      return insert(i, merged, collection);
    }, asFlatArray(cache));
    return { data: entities, fulfilled, rejected };
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
        data: insert(i, merged, data),
        fulfilled: [...fulfilled, remote],
        rejected,
      };
    }, fetchResults);
    return Promise.allSettled(sendRequests).then(handleSendResults);
  });
