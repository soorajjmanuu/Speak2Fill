const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormTemplate = require('../models/FormTemplate');
const geminiService = require('../services/geminiService');

// Multer storage setup for user-uploaded form images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'form-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'), false);
    }
  }
});

/**
 * POST /api/forms/upload
 * Upload a paper form photo (or camera capture), detect fields via Google Gemini Vision,
 * create a new FormTemplate in the database, and return the detected template.
 */
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    let filePath;
    let fileUrl;
    let originalName = 'Uploaded Form';

    if (req.file) {
      filePath = req.file.path;
      fileUrl = `/uploads/${req.file.filename}`;
      originalName = req.file.originalname || 'Captured Form';
    } else if (req.body.sampleTemplateId) {
      // User selected a quick sample form
      const sample = await FormTemplate.findById(req.body.sampleTemplateId);
      if (sample) {
        return res.status(200).json({
          success: true,
          template: sample,
          message: 'Loaded sample form template successfully'
        });
      }
      return res.status(404).json({ error: 'Sample form template not found' });
    } else {
      return res.status(400).json({ error: 'No form image file uploaded or template selected' });
    }

    console.log(`📸 [Form Upload] Received image: ${filePath} (${originalName})`);

    // Call Gemini API (or contextual OCR fallback) to detect fields
    const detected = await geminiService.detectFieldsFromImage(filePath, req.file?.mimetype || 'image/jpeg');

    const formName = req.body.formTitle || detected.formTitle || path.parse(originalName).name || 'Custom Application Form';

    const newTemplate = await FormTemplate.create({
      name: formName,
      description: `Form analyzed and fields detected by AI on ${new Date().toLocaleDateString()}`,
      category: detected.category || 'custom',
      imageUrl: fileUrl,
      fields: detected.fields || [],
      geminiDetected: true
    });

    console.log(`✅ [Form Upload] FormTemplate created with ID: ${newTemplate._id} and ${newTemplate.fields.length} fields.`);

    return res.status(201).json({
      success: true,
      template: newTemplate,
      detectedFieldsCount: newTemplate.fields.length
    });
  } catch (err) {
    console.error('❌ [Form Upload] Error processing upload:', err);
    return res.status(500).json({
      error: 'Failed to process form image and detect fields',
      details: err.message
    });
  }
});

/**
 * GET /api/forms/templates
 * Retrieve all available form templates (sample presets + user-uploaded templates)
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await FormTemplate.find();
    return res.status(200).json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (err) {
    console.error('❌ [Templates] Error fetching templates:', err);
    return res.status(500).json({ error: 'Failed to fetch form templates' });
  }
});

/**
 * GET /api/forms/templates/:id
 * Retrieve a single form template by ID
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const template = await FormTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Form template not found' });
    }
    return res.status(200).json({
      success: true,
      template
    });
  } catch (err) {
    console.error('❌ [Templates] Error fetching template:', err);
    return res.status(500).json({ error: 'Failed to fetch form template' });
  }
});

module.exports = router;
