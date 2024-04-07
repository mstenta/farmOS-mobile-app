import databases from './databases';
import runUpgrades from './runUpgrades';

function openDatabase(dbName) {
  const config = databases[dbName];
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(config.name, config.version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    request.onupgradeneeded = runUpgrades(config);
  });
}

function getOneByPrimaryKey(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = event => resolve([key, event.target.result]);
    request.onerror = event => reject(
      new Error(`Could not retrieve record by key ${key}: ${event.target.error}`),
    );
  });
}
function getManyByPrimaryKeys(store, keys, results = {}) {
  if (keys.length === 0) return Promise.resolve(results);
  const [head, ...tail] = keys;
  const mergeResults = ([key, val]) => ({ ...results, [key]: val });
  const request = getOneByPrimaryKey(store, head);
  if (tail.length <= 0) return request.then(mergeResults);
  return request.then(r => getManyByPrimaryKeys(store, tail, mergeResults(r)));
}
function getAllRecords(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}
function cursorQuery(store, query) {
  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    const results = [];
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (query(cursor.value)) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = event => reject(event);
  });
}
function getter(storeOrIndex, query) {
  if (!query) {
    return getAllRecords(storeOrIndex);
  }
  if (Array.isArray(query)) {
    return getManyByPrimaryKeys(storeOrIndex, query);
  }
  if (typeof query === 'function') {
    return cursorQuery(storeOrIndex, query);
  }
  return getOneByPrimaryKey(storeOrIndex, query).then(([, data]) => data);
}
export function getRecords(dbName, storeName, query) {
  return openDatabase(dbName).then((db) => {
    const store = db.transaction(storeName, 'readonly')
      .objectStore(storeName);
    return getter(store, query);
  });
}
export function getRecordsFromIndex(dbName, storeName, indexName, query) {
  return openDatabase(dbName).then((db) => {
    const index = db.transaction(storeName, 'readonly')
      .objectStore(storeName)
      .index(indexName);
    return getter(index, query);
  });
}

export function count(dbName, storeName, key) {
  return openDatabase(dbName).then(db => new Promise((resolve, reject) => {
    const store = db.transaction(storeName, 'readonly').objectStore(storeName);
    const request = store.count(key);
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(new Error(event.target.error));
  }));
}

export function saveRecord(dbName, storeName, record, key) {
  return openDatabase(dbName).then(db => new Promise((resolve, reject) => {
    const store = db.transaction(storeName, 'readwrite').objectStore(storeName);
    const request = store.put(record, key);
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(new Error(event.target.error));
  }));
}

export function deleteRecord(dbName, storeName, query) {
  return openDatabase(dbName).then(db => new Promise((resolve, reject) => {
    const store = db.transaction(storeName, 'readwrite').objectStore(storeName);
    if (typeof query === 'function') {
      const request = store.openCursor();
      const results = { deleted: [] };
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (query(cursor.value)) {
            results.deleted.push(cursor.value);
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = event => reject(event);
    } else {
      const request = store.delete(query);
      request.onsuccess = event => resolve(event.target.result);
      request.onerror = event => reject(event.target.error);
    }
  }));
}

export const deleteDatabase = dbName => new Promise((resolve, reject) => {
  const request = indexedDB.deleteDatabase(dbName);
  request.onsuccess = resolve;
  request.onerror = reject;
});
