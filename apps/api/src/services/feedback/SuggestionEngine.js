export class SuggestionEngine {
  buildDashboard({ feedback, patterns, improvements }) {
    const acceptedDocuments = feedback.filter((item) => item.feedback_type === 'Accept').length;
    const rejectedDocuments = feedback.filter(
      (item) => item.feedback_type === 'Rejected' || item.feedback_type === 'Manual Rewrite'
    ).length;
    const averageRating =
      feedback.filter((item) => item.rating !== null).reduce((sum, item) => sum + item.rating, 0) /
        Math.max(1, feedback.filter((item) => item.rating !== null).length) || 0;

    return {
      ratings: {
        average: Number(averageRating.toFixed(2)),
        totalResponses: feedback.filter((item) => item.rating !== null).length,
      },
      acceptedDocuments,
      rejectedDocuments,
      commonCorrections: patterns.slice(0, 5),
      improvementSuggestions: improvements,
    };
  }
}
