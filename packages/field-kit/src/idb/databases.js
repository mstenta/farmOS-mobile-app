function createIndices(store, indices) {
  if (store instanceof IDBObjectStore && Array.isArray(indices)) {
    indices.forEach(({ name, keyPath, options }) => {
      store.createIndex(name, keyPath, options);
    });
  }
}

function onUpgradeCreateObjectStore(event, options) {
  const {
    name, keyPath = 'id', autoIncrement = false, indices,
  } = options;
  return new Promise((resolve, reject) => {
    const db = event.target.result;
    try {
      const store = db.createObjectStore(name, { keyPath, autoIncrement });
      createIndices(store, indices);
      resolve(store);
    } catch (error) {
      reject(error);
    }
  });
}

const upgrades = [{
  version: 1,
  onUpgrade: onUpgradeCreateObjectStore,
}];

export default {
  entities: {
    version: 1,
    name: 'entities',
    stores: [
      {
        name: 'asset',
        upgrades,
      },
      {
        name: 'log',
        upgrades,
      },
      {
        name: 'plan',
        upgrades,
      },
      {
        name: 'quantity',
        upgrades,
      },
      {
        name: 'taxonomy_term',
        upgrades,
      },
      {
        name: 'user',
        upgrades,
      },
    ],
  },
  config_documents: {
    version: 1,
    name: 'config_documents',
    stores: [
      {
        name: 'asset',
        keyPath: 'key',
        upgrades,
      },
      {
        name: 'log',
        keyPath: 'key',
        upgrades,
      },
      {
        name: 'plan',
        keyPath: 'key',
        upgrades,
      },
      {
        name: 'quantity',
        keyPath: 'key',
        upgrades,
      },
      {
        name: 'taxonomy_term',
        keyPath: 'key',
        upgrades,
      },
      {
        name: 'user',
        keyPath: 'key',
        upgrades,
      },
    ],
  },
  binary_data: {
    version: 1,
    name: 'binary_data',
    stores: [
      {
        name: 'file',
        indices: [{
          name: 'file_entity_id',
          keyPath: 'file_entity.id',
        }],
        keyPath: 'id',
        upgrades,
      },
      {
        name: 'image',
        indices: [{
          name: 'file_entity_id',
          keyPath: 'file_entity.id',
        }],
        keyPath: 'id',
        upgrades,
      },
    ],
  },
};
