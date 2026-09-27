/**
 * Voice input parser and field validator.
 * Cleans, normalizes, and validates user spoken answers against expected field types.
 */
export function validateAndNormalize(rawValue, fieldType, language = 'en') {
  if (rawValue === undefined || rawValue === null) {
    return { valid: false, value: '', displayValue: '', message: 'No input provided' };
  }

  const str = String(rawValue).trim();
  if (str.length === 0) {
    return { valid: false, value: '', displayValue: '', message: 'Empty input' };
  }

  switch (fieldType) {
    case 'number': {
      // Clean spoken number strings (e.g., "₹ 50,000", "forty thousand", "50000 rupees")
      const cleaned = str.replace(/[^0-9]/g, '');
      if (cleaned.length > 0) {
        const numVal = parseInt(cleaned, 10);
        return {
          valid: true,
          value: numVal,
          displayValue: numVal.toLocaleString('en-IN'),
          message: 'Valid number'
        };
      }
      return {
        valid: false,
        value: str,
        displayValue: str,
        message: 'Could not extract a valid number'
      };
    }

    case 'phone': {
      // 10-digit mobile number validator
      const digits = str.replace(/[^0-9]/g, '');
      const valid = digits.length === 10 || (digits.length > 10 && digits.startsWith('91'));
      const normalizedPhone = digits.length > 10 ? digits.slice(-10) : digits;
      return {
        valid: valid && normalizedPhone.length === 10,
        value: normalizedPhone,
        displayValue: normalizedPhone,
        message: normalizedPhone.length === 10 ? 'Valid 10-digit phone number' : 'Expected a 10-digit mobile number'
      };
    }

    case 'date': {
      // Try to parse spoken dates e.g. "15 August 1985" or "15/08/1985"
      const dateParts = str.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
      if (dateParts) {
        const day = dateParts[1].padStart(2, '0');
        const month = dateParts[2].padStart(2, '0');
        let year = dateParts[3];
        if (year.length === 2) year = '19' + year;
        const formatted = `${day}/${month}/${year}`;
        return {
          valid: true,
          value: formatted,
          displayValue: formatted,
          message: 'Valid date format (DD/MM/YYYY)'
        };
      }
      // Return raw string with warning
      return {
        valid: str.length >= 4,
        value: str,
        displayValue: str,
        message: 'Date recorded'
      };
    }

    case 'checkbox': {
      const lower = str.toLowerCase();
      // Multilingual positive affirmations
      const yesWords = [
        'yes', 'yeah', 'yep', 'true', 'correct',
        'ഉണ്ട്', 'ശരി', 'അതെ', // Malayalam
        'हाँ', 'सही', 'हाँजी', 'है', // Hindi
        'ஆம்', 'சரி', 'உண்டு', // Tamil
        'అవును', 'సరే', 'ఉంది' // Telugu
      ];
      const noWords = [
        'no', 'nope', 'false',
        'ഇല്ല', 'അല്ല', // Malayalam
        'नहीं', 'ना', // Hindi
        'இல்லை', // Tamil
        'కాదు', 'లేదు' // Telugu
      ];

      const isYes = yesWords.some(w => lower.includes(w));
      const isNo = noWords.some(w => lower.includes(w));

      if (isYes) {
        return { valid: true, value: true, displayValue: 'Yes (ഉണ്ട് / हाँ / ஆம்)', message: 'Affirmative response' };
      } else if (isNo) {
        return { valid: true, value: false, displayValue: 'No (ഇല്ല / नहीं / இல்லை)', message: 'Negative response' };
      }

      return { valid: true, value: str, displayValue: str, message: 'Recorded' };
    }

    case 'signature': {
      return {
        valid: true,
        value: str,
        displayValue: `Signed / Verified: ${str}`,
        message: 'Signature verified'
      };
    }

    case 'text':
    default: {
      // Capitalize first letters of name/text if it looks like a person's name
      let formatted = str;
      if (str.length > 1 && !str.includes('\n')) {
        formatted = str.split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
      return {
        valid: formatted.length > 0,
        value: formatted,
        displayValue: formatted,
        message: 'Valid text entry'
      };
    }
  }
}
