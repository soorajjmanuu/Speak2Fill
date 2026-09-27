const FormTemplate = require('../models/FormTemplate');

const sampleFormsData = [
  {
    _id: 'template_kerala_ration',
    name: 'Kerala Civil Supplies - Priority Ration Card Application',
    description: 'Priority household food subsidy & ration card enrolment form (Civil Supplies Dept, Kerala)',
    category: 'ration',
    imageUrl: '/assets/sample-forms/kerala-ration-card.svg',
    imageWidth: 850,
    imageHeight: 1100,
    geminiDetected: true,
    fields: [
      {
        id: 'applicant_name',
        label: 'Head of Family Name (കുടുംബനാഥന്റെ പേര്)',
        type: 'text',
        position: { x: 31.7, y: 20.1, width: 44.7, height: 3.1 },
        expectedFormat: 'Full legal name',
        placeholder: 'e.g. Radhakrishnan Nair',
        helpPrompts: {
          en: 'Please state the full legal name of the head of your family.',
          ml: 'കുടുംബനാഥന്റെ മുഴുവൻ പേര് പറയുക.',
          hi: 'कृपया परिवार के मुखिया का पूरा नाम बताएं।',
          ta: 'குடும்பத் தலைவரின் முழுப் பெயரைச் சொல்லுங்கள்.',
          te: 'దయచేసి కుటుంబ పెద్ద పూర్తి పేరు చెప్పండి.'
        },
        required: true
      },
      {
        id: 'aadhaar_number',
        label: 'Aadhaar Number (12 അക്ക ആധാർ നമ്പർ)',
        type: 'number',
        position: { x: 31.7, y: 26.0, width: 44.7, height: 3.1 },
        expectedFormat: '12-digit number',
        placeholder: '1234 5678 9012',
        helpPrompts: {
          en: 'Please state your 12-digit Aadhaar number slowly and clearly.',
          ml: 'നിങ്ങളുടെ പന്ത്രണ്ട് അക്ക ആധാർ നമ്പർ വ്യക്തമായി പറയുക.',
          hi: 'कृपया अपना 12 अंकों का आधार नंबर बताएं।',
          ta: 'உங்கள் 12 இலக்க ஆதார் எண்ணைச் சொல்லுங்கள்.',
          te: 'మీ 12 అంకెల ఆధార్ సంఖ్యను చెప్పండి.'
        },
        required: true
      },
      {
        id: 'family_members_count',
        label: 'Total Family Members (കുടുംബാംഗങ്ങളുടെ എണ്ണം)',
        type: 'number',
        position: { x: 31.7, y: 32.0, width: 21.2, height: 3.1 },
        expectedFormat: 'Number of members',
        placeholder: 'e.g. 4',
        helpPrompts: {
          en: 'How many total members live in your household?',
          ml: 'നിങ്ങളുടെ കുടുംബത്തിൽ ആകെ എത്ര അംഗങ്ങളുണ്ട്?',
          hi: 'आपके परिवार में कुल कितने सदस्य हैं?',
          ta: 'உங்கள் குடும்பத்தில் மொத்தம் எத்தனை உறுப்பினர்கள் உள்ளனர்?',
          te: 'మీ కుటుంబంలో మొత్తం ఎంతమంది సభ్యులు ఉన్నారు?'
        },
        required: true
      },
      {
        id: 'annual_income',
        label: 'Annual Household Income ₹ (വാർഷിക വരുമാനം)',
        type: 'number',
        position: { x: 31.7, y: 37.9, width: 30.5, height: 3.1 },
        expectedFormat: 'Amount in Rupees',
        placeholder: 'e.g. 45000',
        helpPrompts: {
          en: 'What is your total annual family income in Rupees?',
          ml: 'കുടുംബത്തിന്റെ വാർഷിക വരുമാനം രൂപയിൽ എത്രയാണ്?',
          hi: 'रुपये में आपके परिवार की कुल वार्षिक आय कितनी है?',
          ta: 'உங்கள் குடும்பத்தின் மொத்த ஆண்டு வருமானம் ரூபாயில் எவ்வளவு?',
          te: 'రూపాయలలో మీ కుటుంబ వార్షిక ఆదాయం ఎంత?'
        },
        required: true
      },
      {
        id: 'residential_address',
        label: 'Residential Address (മേൽവിലാസം & വാർഡ്)',
        type: 'text',
        position: { x: 31.7, y: 44.0, width: 61.2, height: 6.4 },
        expectedFormat: 'House name, Ward, Post Office, PIN',
        placeholder: 'House name, Ward, PO, Kerala',
        helpPrompts: {
          en: 'Please speak your house name, street, ward, and post office.',
          ml: 'നിങ്ങളുടെ വീട്ടുപേരും സ്ഥലവും വാർഡും പോസ്റ്റ് ഓഫീസും പറയുക.',
          hi: 'कृपया अपने घर का नाम, मोहल्ला और डाकघर का पता बताएं।',
          ta: 'உங்கள் வீட்டுப் பெயர் மற்றும் முகவரியைச் சொல்லுங்கள்.',
          te: 'దయచేసి మీ ఇంటి పేరు మరియు చిరునామా చెప్పండి.'
        },
        required: true
      },
      {
        id: 'mobile_number',
        label: 'Mobile Phone Number (മൊബൈൽ നമ്പർ)',
        type: 'phone',
        position: { x: 31.7, y: 53.8, width: 35.3, height: 3.1 },
        expectedFormat: '10-digit mobile number',
        placeholder: '9876543210',
        helpPrompts: {
          en: 'What is your 10-digit mobile phone number?',
          ml: 'നിങ്ങളുടെ പത്തക്ക മൊബൈൽ നമ്പർ പറയുക.',
          hi: 'आपका 10 अंकों का मोबाइल नंबर क्या है?',
          ta: 'உங்கள் 10 இலக்க மொபைல் எண் என்ன?',
          te: 'మీ 10 అంకెల మొబైల్ సంఖ్య ఏమిటి?'
        },
        required: true
      },
      {
        id: 'owns_four_wheeler',
        label: 'Owns 4-Wheeler Car? (നാലുചക്ര വാഹനം ഉണ്ടോ?)',
        type: 'checkbox',
        position: { x: 31.7, y: 60.1, width: 18.8, height: 3.1 },
        expectedFormat: 'Yes or No',
        placeholder: 'Yes / No',
        helpPrompts: {
          en: 'Does anyone in your family own a four-wheeler car? Say Yes or No.',
          ml: 'കുടുംബത്തിൽ ആർക്കെങ്കിലും നാലുചക്ര വാഹനം സ്വന്തമായുണ്ടോ? ഉണ്ടെന്നോ ഇല്ലെന്നോ പറയുക.',
          hi: 'क्या परिवार में किसी के पास चार पहिया गाड़ी है? हाँ या ना कहें।',
          ta: 'குடும்பத்தில் யாருக்காவது நான்கு சக்கர கார் உள்ளதா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.',
          te: 'కుటుంబంలో ఎవరికైనా నాలుగు చక్రాల కారు ఉందా? అవును లేదా కాదు అని చెప్పండి.'
        },
        required: false
      }
    ]
  },
  {
    _id: 'template_sbi_account',
    name: 'State Bank Savings Account Opening & KYC Form',
    description: 'SBI Retail Savings Bank Account Customer Information & KYC Form',
    category: 'bank',
    imageUrl: '/assets/sample-forms/sbi-account-form.svg',
    imageWidth: 850,
    imageHeight: 1100,
    geminiDetected: true,
    fields: [
      {
        id: 'applicant_full_name',
        label: 'Full Legal Name (पूरा नाम)',
        type: 'text',
        position: { x: 29.4, y: 20.0, width: 47.0, height: 3.3 },
        expectedFormat: 'As per Aadhaar or PAN card',
        placeholder: 'e.g. Suresh Kumar Verma',
        helpPrompts: {
          en: 'Please state your full legal name as it appears on your Aadhaar or PAN card.',
          ml: 'നിങ്ങളുടെ ആധാർ കാർഡിലുള്ളതുപോലെ മുഴുവൻ പേര് പറയുക.',
          hi: 'कृपया अपना पूरा नाम बताएं जैसा कि आपके आधार या पैन कार्ड पर लिखा है।',
          ta: 'உங்கள் ஆதார் அல்லது பான் கார்டில் உள்ளவாறு உங்கள் முழுப் பெயரைச் சொல்லுங்கள்.',
          te: 'మీ ఆధార్ లేదా పాన్ కార్డులో ఉన్నట్లుగా మీ పూర్తి పేరు చెప్పండి.'
        },
        required: true
      },
      {
        id: 'date_of_birth',
        label: 'Date of Birth (जन्म तिथि)',
        type: 'date',
        position: { x: 29.4, y: 26.5, width: 25.8, height: 3.3 },
        expectedFormat: 'DD/MM/YYYY',
        placeholder: 'DD/MM/YYYY',
        helpPrompts: {
          en: 'What is your date of birth? Say the day, month, and year.',
          ml: 'നിങ്ങളുടെ ജനന തീയതി ഏതാണ്? ദിവസം, മാസം, വർഷം പറയുക.',
          hi: 'आपकी जन्म तिथि क्या है? दिन, महीना और वर्ष बताएं।',
          ta: 'உங்கள் பிறந்த தேதி என்ன? நாள், மாதம் மற்றும் வருடம் சொல்லுங்கள்.',
          te: 'మీ పుట్టిన తేదీ ఏమిటి? రోజు, నెల మరియు సంవత్సరం చెప్పండి.'
        },
        required: true
      },
      {
        id: 'pan_or_form60',
        label: 'PAN Card Number (पैन कार्ड नंबर)',
        type: 'text',
        position: { x: 29.4, y: 32.9, width: 32.9, height: 3.3 },
        expectedFormat: '10-character alphanumeric PAN',
        placeholder: 'ABCDE1234F',
        helpPrompts: {
          en: 'Please state your 10-character PAN number.',
          ml: 'നിങ്ങളുടെ പത്ത് അക്ക പാൻ നമ്പർ പറയുക.',
          hi: 'कृपया अपना 10 अंकों का पैन कार्ड नंबर बताएं।',
          ta: 'உங்கள் 10 இலக்க பான் எண்ணைச் சொல்லுங்கள்.',
          te: 'మీ 10 అంకెల పాన్ సంఖ్యను చెప్పండి.'
        },
        required: true
      },
      {
        id: 'monthly_income',
        label: 'Gross Monthly Income ₹ (मासिक आय)',
        type: 'number',
        position: { x: 29.4, y: 39.2, width: 25.8, height: 3.3 },
        expectedFormat: 'Amount in Rupees',
        placeholder: 'e.g. 25000',
        helpPrompts: {
          en: 'What is your approximate monthly income in Rupees?',
          ml: 'നിങ്ങളുടെ പ്രതിമാസ വരുമാനം രൂപയിൽ എത്രയാണ്?',
          hi: 'रुपये में आपकी अनुमानित मासिक आय कितनी है?',
          ta: 'ரூபாயில் உங்கள் மாத வருமானம் எவ்வளவு?',
          te: 'రూపాయలలో మీ నెలవారీ ఆదాయం ఎంత?'
        },
        required: true
      },
      {
        id: 'nominee_name',
        label: 'Nominee Legal Name (नामित व्यक्ति का नाम)',
        type: 'text',
        position: { x: 29.4, y: 45.6, width: 47.0, height: 3.3 },
        expectedFormat: 'Nominee full name',
        placeholder: 'e.g. Sunita Verma',
        helpPrompts: {
          en: 'Whom would you like to appoint as your bank account nominee?',
          ml: 'നിങ്ങളുടെ നോമിനിയുടെ പേര് പറയുക.',
          hi: 'आप अपने खाते का नॉमिनी किसे बनाना चाहते हैं? उनका नाम बताएं।',
          ta: 'உங்கள் பரிந்துரைக்கப்பட்ட நபரின் பெயர் என்ன?',
          te: 'మీ నామినీ పూర్తి పేరు చెప్పండి.'
        },
        required: false
      },
      {
        id: 'nominee_relationship',
        label: 'Relationship with Nominee (संबंध)',
        type: 'text',
        position: { x: 29.4, y: 52.0, width: 30.5, height: 3.3 },
        expectedFormat: 'Spouse, Son, Daughter, Parent',
        placeholder: 'e.g. Spouse',
        helpPrompts: {
          en: 'What is your relationship with the nominee? For example: Wife, Husband, Son, or Daughter.',
          ml: 'നോമിനിയുമായുള്ള ബന്ധം എന്താണ്?',
          hi: 'नॉमिनी के साथ आपका क्या संबंध है? जैसे पत्नी, पति, पुत्र या माता।',
          ta: 'பரிந்துரைக்கப்பட்டவருடன் உங்கள் உறவு என்ன?',
          te: 'నామినీతో మీ సంబంధం ఏమిటి?'
        },
        required: false
      }
    ]
  },
  {
    _id: 'template_school_admission',
    name: 'State Government School Admission & Scholarship Form',
    description: 'School admission, mother tongue preference & student welfare scheme form',
    category: 'school',
    imageUrl: '/assets/sample-forms/school-admission-form.svg',
    imageWidth: 850,
    imageHeight: 1100,
    geminiDetected: true,
    fields: [
      {
        id: 'student_name',
        label: 'Student Full Name (மாணவர் பெயர்)',
        type: 'text',
        position: { x: 31.7, y: 18.1, width: 44.7, height: 3.3 },
        expectedFormat: 'First and last name',
        placeholder: 'e.g. Meenakshi Sundaram',
        helpPrompts: {
          en: 'What is the full name of the student seeking admission?',
          ml: 'പ്രവേശനം നേടുന്ന വിദ്യാർത്ഥിയുടെ മുഴുവൻ പേര് എന്താണ്?',
          hi: 'दाखिला लेने वाले छात्र का पूरा नाम क्या है?',
          ta: 'சேர்க்கை பெற விரும்பும் மாணவரின் முழுப் பெயரைச் சொல்லுங்கள்.',
          te: 'ప్రవేశం పొందే విద్యార్థి పూర్తి పేరు ఏమిటి?'
        },
        required: true
      },
      {
        id: 'admission_grade',
        label: 'Grade Seeking Admission (வகுப்பு)',
        type: 'text',
        position: { x: 31.7, y: 24.5, width: 23.5, height: 3.3 },
        expectedFormat: 'Grade 1 to 12',
        placeholder: 'e.g. Class 6',
        helpPrompts: {
          en: 'Which class or grade is the student applying for?',
          ml: 'ഏത് ക്ലാസിലേക്കാണ് പ്രവേശനം ആഗ്രഹിക്കുന്നത്?',
          hi: 'छात्र किस कक्षा में दाखिले के लिए आवेदन कर रहा है?',
          ta: 'மாணவர் எந்த வகுப்பில் சேர விண்ணப்பிக்கிறார்?',
          te: 'విద్యార్థి ఏ తరగతి ప్రవేశం కోసం దరఖాస్తు చేస్తున్నారు?'
        },
        required: true
      },
      {
        id: 'mother_tongue',
        label: 'Mother Tongue (தாய்மொழி)',
        type: 'text',
        position: { x: 31.7, y: 30.9, width: 28.2, height: 3.3 },
        expectedFormat: 'Primary spoken language',
        placeholder: 'e.g. Tamil',
        helpPrompts: {
          en: 'What is the primary spoken language or mother tongue at home?',
          ml: 'വീട്ടിൽ സംസാരിക്കുന്ന മാതൃഭാഷ ഏതാണ്?',
          hi: 'घर पर बोली जाने वाली मातृभाषा क्या है?',
          ta: 'வீட்டில் பேசப்படும் தாய்மொழி என்ன?',
          te: 'ఇంట్లో మాట్లాడే మాతృభాష ఏమిటి?'
        },
        required: true
      },
      {
        id: 'guardian_contact',
        label: 'Parent/Guardian Mobile (பெற்றோர் மொபைல்)',
        type: 'phone',
        position: { x: 31.7, y: 37.2, width: 32.9, height: 3.3 },
        expectedFormat: '10-digit mobile number',
        placeholder: '9840123456',
        helpPrompts: {
          en: 'Please state the parent or guardian mobile phone number.',
          ml: 'രക്ഷിതാവിന്റെ മൊബൈൽ ഫോൺ നമ്പർ പറയുക.',
          hi: 'कृपया माता-पिता या अभिभावक का मोबाइल फोन नंबर बताएं।',
          ta: 'பெற்றோர் அல்லது பாதுகாவலரின் மொபைல் எண்ணைச் சொல்லுங்கள்.',
          te: 'దయచేసి తల్లిదండ్రులు లేదా సంరక్షకుల మొబైల్ ఫోన్ నంబర్ చెప్పండి.'
        },
        required: true
      },
      {
        id: 'requires_free_transport',
        label: 'Needs Free School Bus Transport? (பேருந்து வசதி)',
        type: 'checkbox',
        position: { x: 31.7, y: 43.6, width: 21.1, height: 3.3 },
        expectedFormat: 'Yes or No',
        placeholder: 'Yes / No',
        helpPrompts: {
          en: 'Does the student require free school bus transport? Say Yes or No.',
          ml: 'വിദ്യാർത്ഥിക്ക് സ്കൂൾ ബസ് സൗകര്യം ആവശ്യമുണ്ടോ? ഉണ്ടെന്നോ ഇല്ലെന്നോ പറയുക.',
          hi: 'क्या छात्र को स्कूल बस परिवहन सुविधा चाहिए? हाँ या ना कहें।',
          ta: 'மாணவருக்கு இலவச பள்ளி பேருந்து போக்குவரத்து தேவையா? ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.',
          te: 'విద్యార్థికి ఉచిత పాఠశాల బస్సు రవాణా అవసరమా? అవును లేదా కాదు అని చెప్పండి.'
        },
        required: false
      }
    ]
  }
];

async function seedSampleTemplates() {
  try {
    for (const sample of sampleFormsData) {
      const existing = await FormTemplate.findById(sample._id);
      if (!existing) {
        await FormTemplate.create(sample);
      }
    }
    console.log(`✅ [Templates] Seeded ${sampleFormsData.length} pre-configured official application templates!`);
  } catch (err) {
    console.warn('⚠️ [Templates] Error seeding sample forms:', err.message);
  }
}

module.exports = {
  sampleFormsData,
  seedSampleTemplates
};
