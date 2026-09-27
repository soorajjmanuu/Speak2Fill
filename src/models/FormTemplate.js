const mongoose = require('mongoose');
const { getDbMode, getMockStore } = require('../config/db');

const FieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'date', 'checkbox', 'signature', 'number', 'phone', 'email', 'select'],
    default: 'text'
  },
  position: {
    x: { type: Number, default: 0 },      // Percentage (0-100) or pixel from left
    y: { type: Number, default: 0 },      // Percentage (0-100) or pixel from top
    width: { type: Number, default: 20 }, // Percentage width
    height: { type: Number, default: 5 }  // Percentage height
  },
  expectedFormat: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  helpPrompts: {
    en: { type: String, default: '' },
    ml: { type: String, default: '' },
    hi: { type: String, default: '' },
    ta: { type: String, default: '' },
    te: { type: String, default: '' }
  },
  required: { type: Boolean, default: true },
  options: [{ type: String }]
}, { _id: false });

const FormTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['bank', 'ration', 'school', 'govt', 'custom'],
    default: 'custom'
  },
  imageUrl: { type: String, required: true },
  imageWidth: { type: Number, default: 800 },
  imageHeight: { type: Number, default: 1100 },
  fields: [FieldSchema],
  geminiDetected: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MongoFormTemplate = mongoose.model('FormTemplate', FormTemplateSchema);

// Hybrid model interface that seamlessly works with Mongoose or In-Memory Mock Store
const FormTemplate = {
  schema: FormTemplateSchema,
  mongoModel: MongoFormTemplate,

  async find(query = {}) {
    if (getDbMode() === 'mongodb') {
      return await MongoFormTemplate.find(query).lean();
    }
    return await getMockStore('FormTemplates').find(query);
  },

  async findById(id) {
    if (getDbMode() === 'mongodb') {
      try {
        return await MongoFormTemplate.findById(id).lean();
      } catch (e) {
        return null;
      }
    }
    return await getMockStore('FormTemplates').findById(id);
  },

  async findOne(query) {
    if (getDbMode() === 'mongodb') {
      return await MongoFormTemplate.findOne(query).lean();
    }
    return await getMockStore('FormTemplates').findOne(query);
  },

  async create(data) {
    if (getDbMode() === 'mongodb') {
      const doc = new MongoFormTemplate(data);
      const saved = await doc.save();
      return saved.toObject();
    }
    return await getMockStore('FormTemplates').create(data);
  },

  async findByIdAndUpdate(id, update, options = { new: true }) {
    if (getDbMode() === 'mongodb') {
      return await MongoFormTemplate.findByIdAndUpdate(id, update, options).lean();
    }
    return await getMockStore('FormTemplates').findByIdAndUpdate(id, update, options);
  }
};

module.exports = FormTemplate;
