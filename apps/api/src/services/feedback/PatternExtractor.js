const patternMatchers = [
  { type: 'tone', keyword: 'formal', text: 'Always use formal tone.' },
  { type: 'payment', keyword: 'payment term', text: 'Always mention payment terms.' },
  { type: 'vat', keyword: 'vat', text: 'Always include VAT.' },
  { type: 'registration', keyword: 'registration', text: 'Always include company registration.' },
];

export class PatternExtractor {
  extract({ correctedText = '', comment = '' }) {
    const haystack = `${correctedText} ${comment}`.toLowerCase();

    return patternMatchers
      .filter((pattern) => haystack.includes(pattern.keyword))
      .map((pattern) => ({
        patternType: pattern.type,
        patternText: pattern.text,
      }));
  }
}
