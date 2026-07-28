function parseAmount(value) {
  return Number.parseFloat(String(value).replace(/[^\d.]/g, ''));
}

export class DocumentValidator {
  validate({ structuredDocument, missingVariables, existingReferences = [] }) {
    const warnings = [];

    if (missingVariables.length > 0) {
      warnings.push(`Missing variables: ${missingVariables.join(', ')}`);
    }

    if (structuredDocument.sections.some((section) => !section.content.trim())) {
      warnings.push('One or more document sections are empty.');
    }

    const subtotal = parseAmount(structuredDocument.variables.subtotal);
    const tax = parseAmount(structuredDocument.variables.tax);
    const total = parseAmount(structuredDocument.variables.total);

    if (!Number.isNaN(subtotal) && !Number.isNaN(tax) && !Number.isNaN(total)) {
      if (Math.abs(subtotal + tax - total) > 0.01) {
        warnings.push('The provided totals are inconsistent.');
      }
    }

    if (existingReferences.includes(structuredDocument.reference)) {
      warnings.push('Duplicate document reference detected in this conversation.');
    }

    if (!structuredDocument.variables.signature) {
      warnings.push('A signature is required before approval.');
    }

    return warnings;
  }
}
