const documentTemplates = {
  quotation: {
    title: 'Quotation',
    sections: [
      { heading: 'Introduction', content: '{{company_name}} is pleased to provide this quotation for {{client_name}}.' },
      { heading: 'Scope', content: '{{assistant_response}}' },
      { heading: 'Commercial Terms', content: 'Subtotal: {{subtotal}}\nTax: {{tax}}\nTotal: {{total}}' },
      { heading: 'Approval', content: 'Authorized by {{signature}} on {{date}}.' },
    ],
  },
  invoice: {
    title: 'Invoice',
    sections: [
      { heading: 'Billing Summary', content: 'Invoice reference {{reference}} issued to {{client_name}}.' },
      { heading: 'Details', content: '{{assistant_response}}' },
      { heading: 'Totals', content: 'Subtotal: {{subtotal}}\nTax: {{tax}}\nTotal due: {{total}}' },
      { heading: 'Signature', content: '{{signature}}' },
    ],
  },
  'purchase-order': {
    title: 'Purchase Order',
    sections: [
      { heading: 'Supplier', content: 'Purchase order for {{client_name}} at {{address}}.' },
      { heading: 'Order Details', content: '{{assistant_response}}' },
      { heading: 'Financial Summary', content: 'Estimated total: {{total}}' },
      { heading: 'Authorization', content: '{{signature}}' },
    ],
  },
  'delivery-note': {
    title: 'Delivery Note',
    sections: [
      { heading: 'Delivery Reference', content: 'Reference {{reference}} for {{client_name}} dated {{date}}.' },
      { heading: 'Delivered Items', content: '{{items}}' },
      { heading: 'Operational Note', content: '{{assistant_response}}' },
      { heading: 'Confirmation', content: '{{signature}}' },
    ],
  },
  'administrative-letter': {
    title: 'Administrative Letter',
    sections: [
      { heading: 'Recipient', content: '{{client_name}}\n{{address}}' },
      { heading: 'Letter Body', content: '{{assistant_response}}' },
      { heading: 'Closing', content: 'Sincerely,\n{{signature}}' },
    ],
  },
  'commercial-letter': {
    title: 'Commercial Letter',
    sections: [
      { heading: 'Recipient', content: '{{client_name}}' },
      { heading: 'Commercial Message', content: '{{assistant_response}}' },
      { heading: 'Offer Summary', content: 'Reference {{reference}} | Total {{total}}' },
      { heading: 'Signature', content: '{{signature}}' },
    ],
  },
  'internal-memo': {
    title: 'Internal Memo',
    sections: [
      { heading: 'Memo Header', content: 'Department: {{company_name}} | Date: {{date}}' },
      { heading: 'Key Information', content: '{{assistant_response}}' },
      { heading: 'Owner', content: '{{signature}}' },
    ],
  },
  'meeting-report': {
    title: 'Meeting Report',
    sections: [
      { heading: 'Meeting Reference', content: '{{reference}} | {{date}}' },
      { heading: 'Summary', content: '{{assistant_response}}' },
      { heading: 'Participants', content: '{{client_name}}' },
      { heading: 'Prepared By', content: '{{signature}}' },
    ],
  },
  certificate: {
    title: 'Certificate',
    sections: [
      { heading: 'Certificate Statement', content: '{{assistant_response}}' },
      { heading: 'Reference', content: '{{reference}}' },
      { heading: 'Authorized Signature', content: '{{signature}}' },
    ],
  },
  email: {
    title: 'Email',
    sections: [
      { heading: 'To', content: '{{client_name}}' },
      { heading: 'Message', content: '{{assistant_response}}' },
      { heading: 'Closing', content: '{{signature}}' },
    ],
  },
};

export class TemplateEngine {
  loadTemplate(documentType) {
    const template = documentTemplates[documentType];

    if (!template) {
      throw new Error(`Unsupported document type "${documentType}".`);
    }

    return template;
  }
}
