const mongoose = require('mongoose');
const { getDbMode, getMockStore } = require('../config/db');

const AnswerEntrySchema = new mongoose.Schema({
  fieldId: { type: String, required: true },
  fieldLabel: { type: String, default: '' },
  value: { type: mongoose.Schema.Types.Mixed, default: '' },
  displayValue: { type: String, default: '' },
  confirmed: { type: Boolean, default: false },
  skipped: { type: Boolean, default: false },
  audioUrl: { type: String, default: '' },
  transcriptionConfidence: { type: Number, default: 0.95 },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const FillSessionSchema = new mongoose.Schema({
  templateId: { type: String, required: true },
  templateName: { type: String, default: 'Untitled Form' },
  formImageUrl: { type: String, default: '' },
  userId: { type: String, default: 'anonymous_device' },
  language: {
    type: String,
    enum: ['ml', 'hi', 'ta', 'te', 'en'],
    default: 'en'
  },
  currentFieldIndex: { type: Number, default: 0 },
  totalFields: { type: Number, default: 0 },
  progress: { type: Number, default: 0 }, // 0 to 100 percentage
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  },
  answers: {
    type: Map,
    of: AnswerEntrySchema,
    default: {}
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MongoFillSession = mongoose.model('FillSession', FillSessionSchema);

const FillSession = {
  schema: FillSessionSchema,
  mongoModel: MongoFillSession,

  async find(query = {}) {
    if (getDbMode() === 'mongodb') {
      return await MongoFillSession.find(query).sort({ updatedAt: -1 }).lean();
    }
    const results = await getMockStore('FillSessions').find(query);
    return results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  async findById(id) {
    if (getDbMode() === 'mongodb') {
      try {
        return await MongoFillSession.findById(id).lean();
      } catch (e) {
        return null;
      }
    }
    return await getMockStore('FillSessions').findById(id);
  },

  async create(data) {
    if (getDbMode() === 'mongodb') {
      const doc = new MongoFillSession(data);
      const saved = await doc.save();
      return saved.toObject();
    }
    return await getMockStore('FillSessions').create(data);
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    if (getDbMode() === 'mongodb') {
      return await MongoFillSession.findByIdAndUpdate(id, update, options).lean();
    }
    return await getMockStore('FillSessions').findByIdAndUpdate(id, update, options);
  }
};

module.exports = FillSession;
