const mongoose = require('mongoose');

let isConnected = false;
let dbMode = 'uninitialized';

// In-memory fallback repository for environments without an active MongoDB server
class MockCollection {
  constructor(name) {
    this.name = name;
    this.items = [];
  }

  async find(query = {}) {
    return this.items.filter(item => {
      return Object.keys(query).every(key => {
        if (query[key] === undefined) return true;
        return String(item[key]) === String(query[key]);
      });
    }).map(i => ({ ...i }));
  }

  async findOne(query = {}) {
    const list = await this.find(query);
    return list[0] || null;
  }

  async findById(id) {
    const item = this.items.find(i => String(i._id) === String(id));
    return item ? { ...item } : null;
  }

  async create(data) {
    const doc = {
      ...data,
      _id: data._id || 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.items.push(doc);
    return { ...doc };
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    const idx = this.items.findIndex(i => String(i._id) === String(id));
    if (idx === -1) return null;

    let updated = { ...this.items[idx] };
    if (update.$set) {
      updated = { ...updated, ...update.$set };
    } else {
      updated = { ...updated, ...update };
    }
    updated.updatedAt = new Date();
    this.items[idx] = updated;
    return { ...updated };
  }

  async deleteOne(query) {
    const idx = this.items.findIndex(item => {
      return Object.keys(query).every(k => String(item[k]) === String(query[k]));
    });
    if (idx !== -1) {
      this.items.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }
}

const mockStores = {
  FormTemplates: new MockCollection('FormTemplates'),
  FillSessions: new MockCollection('FillSessions'),
  FieldProgress: new MockCollection('FieldProgress')
};

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/speak2fill';

  try {
    console.log(`[DB] Attempting connection to MongoDB at: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    isConnected = true;
    dbMode = 'mongodb';
    console.log('✅ [DB] Successfully connected to live MongoDB database!');
  } catch (err) {
    console.warn('⚠️  [DB] Live MongoDB server not reachable at ' + uri);
    console.warn('💡 [DB] Switching gracefully to in-memory fallback store so Speak2Fill works 100% out of the box.');
    console.warn('💡 [DB] To use persistent MongoDB, start MongoDB locally (`mongod`) or set MONGODB_URI in .env');
    isConnected = false;
    dbMode = 'mock';
  }

  return { isConnected, dbMode };
}

function getDbMode() {
  return dbMode;
}

function getMockStore(collectionName) {
  return mockStores[collectionName];
}

module.exports = {
  connectDB,
  getDbMode,
  getMockStore,
  mockStores
};
