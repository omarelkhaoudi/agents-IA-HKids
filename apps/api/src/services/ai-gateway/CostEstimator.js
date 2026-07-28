const pricingPerMillionTokens = {
  'claude-3-5-sonnet-latest': { input: 3, output: 15 },
  'claude-3-5-haiku-latest': { input: 0.8, output: 4 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'llama3': { input: 0, output: 0 },
};

export class CostEstimator {
  estimate({ model, promptTokens = 0, completionTokens = 0 }) {
    const pricing = pricingPerMillionTokens[model] || { input: 3, output: 15 };
    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
