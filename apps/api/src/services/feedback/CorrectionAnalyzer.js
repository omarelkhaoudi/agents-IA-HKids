function detectCorrectionTypes(originalText, correctedText, comment = '') {
  const lowerOriginal = originalText.toLowerCase();
  const lowerCorrected = correctedText.toLowerCase();
  const lowerComment = comment.toLowerCase();
  const types = [];

  if (correctedText.length > originalText.length + 40) {
    types.push('added sections');
  }

  if (correctedText.length + 40 < originalText.length) {
    types.push('removed sections');
  }

  if (lowerOriginal !== lowerCorrected) {
    types.push('rewritten paragraphs');
  }

  if (lowerComment.includes('tone') || lowerComment.includes('formal')) {
    types.push('tone changes');
  }

  if (lowerComment.includes('format') || lowerComment.includes('layout')) {
    types.push('formatting changes');
  }

  if (
    lowerComment.includes('price') ||
    lowerComment.includes('pricing') ||
    lowerComment.includes('vat')
  ) {
    types.push('pricing corrections');
  }

  if (
    lowerComment.includes('legal') ||
    lowerComment.includes('registration') ||
    lowerComment.includes('compliance')
  ) {
    types.push('legal corrections');
  }

  return Array.from(new Set(types));
}

export class CorrectionAnalyzer {
  analyze({ originalText, correctedText, comment }) {
    return detectCorrectionTypes(originalText, correctedText || originalText, comment);
  }
}
