const mongoose = require('mongoose');
const { getDbMode, getMockStore } = require('../config/db');

const FieldProgressSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  fieldId: { type: String, required: true },
  fieldLabel: { type: String, default: '' },
  spokenLanguage: { type: String, default: 'en' },
  rawTranscript: { type: String, default: '' },
  parsedValue: { type: mongoose.Schema.Types.Mixed, default: '' },
  state: {
    type: String,
    enum: ['prompted', 'listening', 'transcribed', 'validated', 'confirmed', 'rejected', 'skipped'],
    default: 'prompted'
  },
  attemptsCount: { type: Number, default: 1 },
  validationError: { type: String, default: '' },
  audioSnippetUrl: { type: String, default: '' },
  durationSeconds: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const MongoFieldProgress = mongoose.model('FieldProgress', FieldProgressSchema);

const FieldProgress = {
  schema: FieldProgressSchema,
  mongoModel: MongoFieldProgress,

  async find(query = {}) {
    if (getDbMode() === 'mongodb') {
      return await MongoFieldProgress.find(query).sort({ createdAt: 1 }).lean();
    }
    return await getMockStore('FieldProgress').find(query);
  },

  async create(data) {
    if (getDbMode() === 'mongodb') {
      const doc = new MongoFieldProgress(data);
      const saved = await doc.save();
      return saved.toObject();
    }
    return await getMockStore('FieldProgress').create(data);
  }
};

module.exports = FieldProgress;
