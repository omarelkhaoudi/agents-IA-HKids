function getDisplayDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

const now = getDisplayDate();

let documents = [
  {
    id: 'doc-001',
    title: 'Parent Enrollment Policy',
    category: 'Administration',
    description: 'Internal policy reference for enrollment workflow and required validation steps.',
    tags: ['policy', 'enrollment', 'parents'],
    createdDate: '15 Jul 2026',
    updatedDate: now,
    size: '1.8 MB',
    status: 'active',
    author: 'Sara El Idrissi',
    fileType: 'PDF',
    sourceFileName: 'parent-enrollment-policy.pdf',
  },
  {
    id: 'doc-002',
    title: 'Supplier Contact Directory',
    category: 'Procurement',
    description: 'Curated supplier directory with procurement contacts and delivery commitments.',
    tags: ['supplier', 'vendors', 'contacts'],
    createdDate: '10 Jul 2026',
    updatedDate: '26 Jul 2026',
    size: '0.4 MB',
    status: 'review',
    author: 'Youssef Benali',
    fileType: 'XLSX',
    sourceFileName: 'supplier-contact-directory.xlsx',
  },
  {
    id: 'doc-003',
    title: 'Registration Checklist',
    category: 'Operations',
    description: 'Operational checklist covering onboarding documents and administrative milestones.',
    tags: ['checklist', 'operations', 'registration'],
    createdDate: '12 Jul 2026',
    updatedDate: '24 Jul 2026',
    size: '0.2 MB',
    status: 'active',
    author: 'Nadia Karim',
    fileType: 'DOCX',
    sourceFileName: 'registration-checklist.docx',
  },
  {
    id: 'doc-004',
    title: 'Monthly Billing Notes',
    category: 'Finance',
    description: 'Reference notes for monthly administrative billing and invoicing exceptions.',
    tags: ['billing', 'finance', 'invoice'],
    createdDate: '08 Jul 2026',
    updatedDate: '22 Jul 2026',
    size: '0.1 MB',
    status: 'archived',
    author: 'Mina Rahal',
    fileType: 'TXT',
    sourceFileName: 'monthly-billing-notes.txt',
  },
  {
    id: 'doc-005',
    title: 'Transport Allocation Export',
    category: 'Logistics',
    description: 'Exported seat and route allocation sheet for active transport requests.',
    tags: ['transport', 'allocation', 'export'],
    createdDate: '18 Jul 2026',
    updatedDate: '27 Jul 2026',
    size: '0.6 MB',
    status: 'active',
    author: 'Operations Team',
    fileType: 'CSV',
    sourceFileName: 'transport-allocation-export.csv',
  },
];

export function listDocuments() {
  return documents;
}

export function createDocument(payload) {
  const timestamp = getDisplayDate();
  const document = {
    id: `doc-${Date.now()}`,
    ...payload,
    createdDate: timestamp,
    updatedDate: timestamp,
  };

  documents = [document, ...documents];
  return document;
}

export function updateDocument(documentId, payload) {
  let updatedDocument = null;
  const timestamp = getDisplayDate();

  documents = documents.map((document) => {
    if (document.id !== documentId) {
      return document;
    }

    updatedDocument = {
      ...document,
      ...payload,
      updatedDate: timestamp,
    };

    return updatedDocument;
  });

  return updatedDocument;
}

export function removeDocument(documentId) {
  const initialCount = documents.length;
  documents = documents.filter((document) => document.id !== documentId);
  return documents.length < initialCount;
}
