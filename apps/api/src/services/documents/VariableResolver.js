function replacePlaceholders(content, variables) {
  return content.replace(/\{\{([^}]+)\}\}/g, (_match, key) => {
    const normalizedKey = key.trim();
    return variables[normalizedKey] || `{{${normalizedKey}}}`;
  });
}

function buildItemsHtml(items) {
  if (!items) {
    return '<tr><td>Administrative support</td><td>1</td><td>MAD 0</td></tr>';
  }

  return items
    .split(',')
    .map((item, index) => `<tr><td>${item.trim()}</td><td>1</td><td>Line ${index + 1}</td></tr>`)
    .join('');
}

export class VariableResolver {
  resolve({ template, assistantResponse, variables, companyProfile, customerProfile, language }) {
    const resolvedVariables = {
      company_name: companyProfile.companyName,
      client_name: customerProfile.clientName,
      address: customerProfile.address,
      date: variables.date || new Date().toLocaleDateString('en-GB'),
      reference: variables.reference || `REF-${Date.now()}`,
      items: buildItemsHtml(variables.items),
      subtotal: variables.subtotal || 'MAD 0',
      tax: variables.tax || 'MAD 0',
      total: variables.total || 'MAD 0',
      signature: variables.signature || companyProfile.contactName,
      assistant_response: assistantResponse,
      language,
      ...variables,
    };

    const missingVariables = Object.entries(resolvedVariables)
      .filter(([, value]) => value === undefined || value === null || value === '')
      .map(([key]) => key);

    const resolvedSections = template.sections.map((section) => ({
      heading: section.heading,
      content: replacePlaceholders(section.content, resolvedVariables),
    }));

    return {
      resolvedVariables,
      resolvedSections,
      missingVariables,
    };
  }
}
