export class PromptOptimizer {
  buildSuggestions(patterns) {
    return patterns.map((pattern) => ({
      promptId: null,
      suggestionText: `Consider adding this rule to prompt instructions: ${pattern.patternText}`,
      rationale: `Detected recurring correction pattern of type "${pattern.patternType}".`,
      metadata: {
        patternType: pattern.patternType,
      },
    }));
  }
}
