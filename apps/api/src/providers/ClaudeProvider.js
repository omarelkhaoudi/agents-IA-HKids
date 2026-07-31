import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { secretManager } from '../services/security/SecretManager.js';

export class ClaudeProvider {
  constructor(config = env, manager = secretManager) {
    this.config = config;
    this.secretManager = manager;
  }

  async generateResponse({ model, systemPrompt, messages }) {
    const { apiKey } = this.secretManager.getProviderConfiguration('anthropic');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is missing. Claude provider cannot be used yet.');
    }

    const client = new Anthropic({
      apiKey,
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
