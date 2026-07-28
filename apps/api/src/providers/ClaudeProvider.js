import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

export class ClaudeProvider {
  constructor(config = env) {
    this.config = config;
  }

  async generateResponse({ model, systemPrompt, messages }) {
    if (!this.config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is missing. Claude provider cannot be used yet.');
    }

    const client = new Anthropic({
      apiKey: this.config.anthropicApiKey,
    });

    const response = await client.messages.create({
      model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n')
      .trim();

    return {
      text: textContent,
      raw: response,
    };
  }
}
