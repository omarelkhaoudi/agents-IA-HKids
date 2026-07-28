import { ClaudeProvider } from './ClaudeProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

export class ProviderFactory {
  createProvider(providerName = 'anthropic') {
    switch (providerName) {
      case 'anthropic':
        return new ClaudeProvider();
      case 'openai':
        return new OpenAIProvider();
      case 'gemini':
        return new GeminiProvider();
      case 'ollama':
        return new OllamaProvider();
      default:
        throw new Error(`Unknown provider "${providerName}".`);
    }
  }
}
