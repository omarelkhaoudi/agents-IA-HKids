export interface GeneratedDocumentRecord {
  id: string;
  approved: boolean;
  version?: number;
  status?: string;
  createdAt?: string;
  createdBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  structuredDocument: {
    id: string;
    type: string;
    title: string;
    language: string;
    reference: string;
    sections: Array<{
      heading: string;
      content: string;
    }>;
    variables: Record<string, string>;
  };
  resolvedVariables: Record<string, string>;
  renderedPreview: string;
  validationWarnings: string[];
  availableExportFormats: string[];
}
