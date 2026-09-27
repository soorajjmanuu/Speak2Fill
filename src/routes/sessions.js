const express = require('express');
const router = express.Router();
const FillSession = require('../models/FillSession');
const FormTemplate = require('../models/FormTemplate');
const FieldProgress = require('../models/FieldProgress');

/**
 * POST /api/sessions
 * Create a new FillSession linked to a FormTemplate with user-selected language
 */
router.post('/', async (req, res) => {
  try {
    const { templateId, language = 'en', userId = 'browser_user' } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'templateId is required to start a session' });
    }

    const template = await FormTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Form template not found' });
    }

    const totalFields = template.fields?.length || 0;

    const newSession = await FillSession.create({
      templateId: String(template._id),
      templateName: template.name,
      formImageUrl: template.imageUrl,
      userId,
      language,
      currentFieldIndex: 0,
      totalFields,
      progress: 0,
      status: 'in_progress',
      answers: {}
    });

    console.log(`✨ [Session Created] Session ID ${newSession._id} for Template "${template.name}" in language "${language}"`);

    return res.status(201).json({
      success: true,
      session: newSession,
      template
    });
  } catch (err) {
    console.error('❌ [Session] Error creating session:', err);
    return res.status(500).json({ error: 'Failed to create fill session', details: err.message });
  }
});

/**
 * GET /api/sessions
 * List all fill sessions (optionally filtered by userId or status)
 */
router.get('/', async (req, res) => {
  try {
    const { userId, status } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const sessions = await FillSession.find(filter);
    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (err) {
    console.error('❌ [Session] Error fetching sessions:', err);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * GET /api/sessions/:id
 * Retrieve a fill session and its linked FormTemplate (Resume Session)
 */
router.get('/:id', async (req, res) => {
  try {
    const session = await FillSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Fill session not found' });
    }

    const template = await FormTemplate.findById(session.templateId);
    const history = await FieldProgress.find({ sessionId: String(session._id) });

    return res.status(200).json({
      success: true,
      session,
      template,
      history
    });
  } catch (err) {
    console.error('❌ [Session] Error resuming session:', err);
    return res.status(500).json({ error: 'Failed to resume session' });
  }
});

/**
 * PATCH /api/sessions/:id/field/:fieldId
 * Save a transcribed answer for a specific field, record FieldProgress, and recalculate session progress
 */
router.patch('/:id/field/:fieldId', async (req, res) => {
  try {
    const { id, fieldId } = req.params;
    const {
      value,
      displayValue,
      confirmed = true,
      skipped = false,
      rawTranscript = '',
      fieldLabel = '',
      audioUrl = ''
    } = req.body;

    const session = await FillSession.findById(id);
    if (!session) {
      return res.status(404).json({ error: 'Fill session not found' });
    }

    const template = await FormTemplate.findById(session.templateId);
    if (!template) {
      return res.status(404).json({ error: 'Linked template not found' });
    }

    // Ensure answers object exists
    let answers = session.answers || {};
    if (answers instanceof Map) {
      answers = Object.fromEntries(answers);
    } else {
      answers = { ...answers };
    }

    answers[fieldId] = {
      fieldId,
      fieldLabel: fieldLabel || fieldId,
      value: value !== undefined ? value : '',
      displayValue: displayValue || String(value || ''),
      confirmed: !!confirmed,
      skipped: !!skipped,
      audioUrl: audioUrl || '',
      transcriptionConfidence: 0.96,
      updatedAt: new Date()
    };

    // Calculate updated progress
    const totalFields = template.fields.length;
    const answeredCount = Object.values(answers).filter(a => a.confirmed || a.skipped).length;
    const progress = totalFields > 0 ? Math.round((answeredCount / totalFields) * 100) : 0;

    // Advance to next field if current was confirmed/skipped
    let nextIndex = session.currentFieldIndex;
    const currentField = template.fields[session.currentFieldIndex];
    if (currentField && currentField.id === fieldId) {
      nextIndex = Math.min(session.currentFieldIndex + 1, totalFields);
    }

    const isFullyCompleted = answeredCount >= totalFields;
    const updatedStatus = isFullyCompleted ? 'completed' : 'in_progress';

    const updatedSession = await FillSession.findByIdAndUpdate(
      id,
      {
        $set: {
          answers,
          progress,
          currentFieldIndex: nextIndex,
          status: updatedStatus,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    // Save FieldProgress audit log
    await FieldProgress.create({
      sessionId: String(id),
      fieldId,
      fieldLabel,
      spokenLanguage: session.language,
      rawTranscript: rawTranscript || String(value || ''),
      parsedValue: value,
      state: skipped ? 'skipped' : (confirmed ? 'confirmed' : 'transcribed'),
      attemptsCount: 1,
      audioSnippetUrl: audioUrl
    });

    console.log(`💾 [Session Saved] Session ${id} field "${fieldId}" saved with value "${value}". Progress: ${progress}%`);

    return res.status(200).json({
      success: true,
      session: updatedSession,
      isFullyCompleted,
      progress,
      nextIndex
    });
  } catch (err) {
    console.error('❌ [Session] Error updating field:', err);
    return res.status(500).json({ error: 'Failed to update field answer', details: err.message });
  }
});

/**
 * POST /api/sessions/:id/complete
 * Mark session as officially completed / submitted
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const updatedSession = await FillSession.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'completed', progress: 100, updatedAt: new Date() } },
      { new: true }
    );
    if (!updatedSession) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.status(200).json({ success: true, session: updatedSession });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to complete session' });
  }
});

module.exports = router;
