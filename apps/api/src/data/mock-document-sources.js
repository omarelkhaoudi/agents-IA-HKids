let sources = [
  {
    documentId: 'doc-001',
    content: `
Parent Enrollment Policy

H-Kids requires every enrollment file to contain guardian identification, emergency contacts,
medical record confirmation, and signed administrative authorization before final approval.

The administration team must confirm document completeness, validate the reception date,
and notify operations once the file is ready for onboarding scheduling.
`,
    priority: 3,
  },
  {
    documentId: 'doc-002',
    content: `
Supplier Contact Directory

Atlas Education Supplies handles classroom stationery, welcome kits, and onboarding materials.
Primary delivery commitment is five working days for standard orders.

Finance questions should be routed to the supplier billing contact, while delivery exceptions
must be escalated to operations and procurement.
`,
    priority: 2,
  },
  {
    documentId: 'doc-003',
    content: `
Registration Checklist

Step 1: collect registration form, identity copy, and medical declaration.
Step 2: verify transport preference and emergency contact details.
Step 3: confirm onboarding calendar and hand over the welcome package.

This checklist is used by the administrative assistant to keep enrollment tasks traceable.
`,
    priority: 3,
  },
  {
    documentId: 'doc-004',
    content: `
Monthly Billing Notes

Invoices for recurring support services must include due date, reference number,
approved pricing line items, and manager validation before dispatch.

Exceptions related to discounts or payment rescheduling must be reviewed by finance leadership.
`,
    priority: 1,
  },
  {
    documentId: 'doc-005',
    content: `
Transport Allocation Export

Route A covers Maarif and Racine families. Route B covers Californie and Bouskoura.
Seat availability must be checked before confirming parent transportation requests.

Administrative follow-up should align transport communication with the final onboarding schedule.
`,
    priority: 2,
  },
];

export function listDocumentSources() {
  return sources;
}

export function createDocumentSource(document) {
  const source = {
    documentId: document.id,
    content: `
${document.title}

${document.description}

Category: ${document.category}
Tags: ${document.tags.join(', ')}
Author: ${document.author}
Type: ${document.fileType}
`,
    priority: document.status === 'active' ? 2 : 1,
  };

  sources = [source, ...sources];
  return source;
}

export function updateDocumentSource(document) {
  sources = sources.map((source) =>
    source.documentId === document.id
      ? {
          ...source,
          content: `
${document.title}

${document.description}

Category: ${document.category}
Tags: ${document.tags.join(', ')}
Author: ${document.author}
Type: ${document.fileType}
`,
          priority: document.status === 'active' ? 2 : 1,
        }
      : source
  );
}

export function removeDocumentSource(documentId) {
  sources = sources.filter((source) => source.documentId !== documentId);
}
