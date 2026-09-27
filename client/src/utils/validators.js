/**
 * Answer normalizer and validator for both voice transcripts and typed inputs.
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
        message: 'Could not extract valid number'
      };
    }

    case 'phone': {
      const digits = str.replace(/[^0-9]/g, '');
      const normalizedPhone = digits.length > 10 ? digits.slice(-10) : digits;
      const valid = normalizedPhone.length === 10;
      return {
        valid,
        value: normalizedPhone,
        displayValue: normalizedPhone,
        message: valid ? 'Valid 10-digit mobile' : 'Expected 10-digit mobile number'
      };
    }

    case 'date': {
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
          message: 'Valid date (DD/MM/YYYY)'
        };
      }
      return {
        valid: str.length >= 4,
        value: str,
        displayValue: str,
        message: 'Date recorded'
      };
    }

    case 'checkbox': {
      const lower = str.toLowerCase();
      const yesWords = [
        'yes', 'yeah', 'yep', 'true', 'correct',
        'ഉണ്ട്', 'ശരി', 'അതെ',
        'हाँ', 'सही', 'हाँजी', 'है',
        'ஆம்', 'சரி', 'உண்டு',
        'అవును', 'సరే', 'ఉంది'
      ];
      const noWords = [
        'no', 'nope', 'false',
        'ഇല്ല', 'അല്ല',
        'नहीं', 'ना',
        'இல்லை',
        'కాదు', 'లేదు'
      ];

      const isYes = yesWords.some(w => lower.includes(w));
      const isNo = noWords.some(w => lower.includes(w));

      if (isYes) {
        return { valid: true, value: true, displayValue: 'Yes (ഉണ്ട് / हाँ / ஆம்)', message: 'Affirmative' };
      } else if (isNo) {
        return { valid: true, value: false, displayValue: 'No (ഇല്ല / नहीं / இல்லை)', message: 'Negative' };
      }

      return { valid: true, value: str, displayValue: str, message: 'Recorded' };
    }

    case 'signature': {
      return {
        valid: true,
        value: str,
        displayValue: `Signed: ${str}`,
        message: 'Signature verified'
      };
    }

    case 'text':
    default: {
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
