const fs = require('fs');
const OpenAI = require('openai');

/**
 * Service to interact with OpenAI Vision API (GPT-4o) for OCR and Form Field Detection.
 * Extracts: field labels, types, bounding boxes (x, y, width, height in %),
 * expected data formats, placeholders, and localized voice prompts in Indic languages.
 */
class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  _getClient() {
    const key = process.env.OPENAI_API_KEY || this.apiKey;
    if (!key) {
      throw new Error('OPENAI_API_KEY is not configured in .env. Please set OPENAI_API_KEY to detect fields from form images.');
    }
    if (!this.client || this.client.apiKey !== key) {
      this.client = new OpenAI({ apiKey: key });
    }
    return this.client;
  }

  /**
   * Detect fields from an uploaded image file using OpenAI GPT-4o Vision
   * @param {string} imagePath - Absolute path to image on disk
   * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
   * @returns {Promise<{formTitle: string, category: string, fields: Array}>}
   */
  async detectFieldsFromImage(imagePath, mimeType = 'image/jpeg') {
    const openai = this._getClient();

    console.log(`🤖 [OpenAIService] Calling OpenAI GPT-4o Vision API for ${imagePath}...`);
    const imageBytes = fs.readFileSync(imagePath);
    const base64Image = imageBytes.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `You are an expert assistive document AI analyzer specialized in reading paper application forms (government forms, ration cards, bank KYC, school admissions, affidavits).
Analyze this form image and detect all fillable blanks, input boxes, and response fields in logical reading order.
For each fillable field, return:
- id: a snake_case identifier (e.g. applicant_name, date_of_birth, monthly_income)
- label: clear readable label in English
- type: one of ["text", "date", "number", "phone", "email", "checkbox", "signature"]
- position: estimated percentage coordinate relative to the form image (x: 0-100 from left edge, y: 0-100 from top edge, width: 0-100, height: 0-100)
- expectedFormat: format guidance (e.g. "DD/MM/YYYY" or "10-digit number" or "Full legal name")
- placeholder: intuitive example
- helpPrompts: localized voice questions asking the user for this field in:
  * "en": "What is your [field]?"
  * "ml": Malayalam voice question
  * "hi": Hindi voice question
  * "ta": Tamil voice question
  * "te": Telugu voice question
- required: boolean

Respond strictly with valid JSON conforming to this schema:
{
  "formTitle": "Document Title",
  "category": "govt" | "bank" | "school" | "ration" | "custom",
  "fields": [
    {
      "id": "string",
      "label": "string",
      "type": "text|date|number|phone|email|checkbox|signature",
      "position": { "x": number, "y": number, "width": number, "height": number },
      "expectedFormat": "string",
      "placeholder": "string",
      "helpPrompts": {
        "en": "string",
        "ml": "string",
        "hi": "string",
        "ta": "string",
        "te": "string"
      },
      "required": boolean
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const parsed = JSON.parse(content);
    console.log(`✅ [OpenAIService] Detected ${parsed.fields?.length || 0} fields from image using GPT-4o!`);
    return parsed;
  }
}

module.exports = new OpenAIService();
