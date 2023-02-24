import { validate, v4 as uuidv4 } from 'uuid';
import { getRecords, getRecordsFromIndex, saveRecord } from '.';
import dbs from './databases.js';

const validStores = dbs.binary_data.stores.map(s => s.name);
const defaultMime = 'application/octet-stream';

/**
 * @typedef {Object} EntityFileData
 * @property {String} id
 * @property {String} type
 * @property {Object|File|Blob} [data]
 * @property {Object} [file_entity]
 * @property {String} filename
 * @property {String} mime
 * @property {[{ id, type }]} references
 * @property {String} [url]
 */

/** @typedef {Object.<String, EntityFileData>} FileDataByField */
/** @typedef {Object.<String, FileDataByField>} FileDataByHostId */

/**
 * @type {Function}
 * @param {Object|File|Blob} [data]
 * @param {Object} [file_entity]
 * @param {Object} [options]
 * @returns {EntityFileData}
 */
export function fmtFileData(data = null, file_entity = null, options = {}) {
  const { id: entity_id, attributes = {} } = file_entity || {};
  const { filename: entity_filename, filemime, uri = {} } = attributes;
  const {
    mime = data?.type || filemime || defaultMime,
    references = [],
    url = uri.url || null,
  } = options;
  let { filename = data?.name || entity_filename, id = entity_id, type } = options;
  if (!validate(id)) id = uuidv4();
  if (!validStores.includes(type)) {
    const [f1, ...fields] = references.flatMap(r => r?.fields || []);
    if (mime.startsWith('image')) type = 'image';
    else if (validStores.includes(f1) && fields.every(fN => f1 === fN)) type = f1;
    else type = 'file';
  }
  if (!filename) filename = `${type}-${id}`;
  return {
    id, type, data, file_entity, filename, mime, references, url,
  };
}

/**
 * @type {Function}
 * @param {Object|File|Blob} [data]
 * @param {Object} [file_entity]
 * @param {Object} [options]
 * @returns {Promise<EntityFileData>}
*/
export function cacheFileData(data, file_entity, options = {}) {
  const _options = { ...options };
  // Never store object URL's, which share a lifespan with the window document.
  // See https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
  // and https://w3c.github.io/FileAPI/#url-model for more details.
  if (_options.url?.startsWith('blob:')) delete _options.url;
  const record = fmtFileData(data, file_entity, _options);
  return saveRecord('binary_data', record.type, record).then(() => record);
}

export async function loadFileData(fileIdentifier) {
  const { type: store, id } = fileIdentifier;
  return getRecords('binary_data', store, id);
}

export async function loadFilesByField(fileIdentifiers) {
  const loader = async ([field, fileIds]) => {
    const requests = fileIds.map(loadFileData);
    const fileData = await Promise.all(requests);
    return [field, fileData];
  };
  const requestsByField = Object.entries(fileIdentifiers).map(loader);
  const resultsByField = await Promise.all(requestsByField);
  return Object.fromEntries(resultsByField);
}

export async function loadFilesByHostId(fileIdentifiers) {
  const loader = async ([hostId, filesByField]) => {
    const resultsByField = await loadFilesByField(filesByField);
    return [hostId, resultsByField];
  };
  const requestsByHostId = Object.entries(fileIdentifiers).map(loader);
  const resultsByHostId = await Promise.all(requestsByHostId);
  return Object.fromEntries(resultsByHostId);
}

export function loadFileEntity(fileEntity) {
  const db = 'binary_data';
  const index = 'file_entity_id';
  function loader(entity, stores) {
    if (stores.length <= 0) return null;
    const [store, ...tail] = stores;
    return getRecordsFromIndex(db, store, index, entity.id)
      .catch(() => loader(entity, tail));
  }
  return loader(fileEntity, validStores);
}
