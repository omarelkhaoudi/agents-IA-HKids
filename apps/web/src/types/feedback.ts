export interface FeedbackDashboardData {
  ratings: {
    average: number;
    totalResponses: number;
  };
  acceptedDocuments: number;
  rejectedDocuments: number;
  commonCorrections: Array<{
    id: string;
    pattern_type: string;
    pattern_text: string;
    occurrences: number;
    status: string;
  }>;
  improvementSuggestions: Array<{
    id: string;
    prompt_id: string | null;
    suggestion_text: string;
    rationale: string;
    status: string;
  }>;
}
