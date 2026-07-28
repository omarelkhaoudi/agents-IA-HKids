import { env } from '../../config/env.js';

const catalog = [
  {
    id: 'claude-3-5-sonnet-latest',
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    available: true,
  },
  {
    id: 'claude-3-5-haiku-latest',
    label: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    available: true,
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    available: false,
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openai',
    available: false,
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'gemini',
    available: false,
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'gemini',
    available: false,
  },
  {
    id: 'llama3',
    label: 'Llama 3 (Ollama)',
    provider: 'ollama',
    available: false,
  },
];

export class ModelManager {
  constructor(config = env) {
    this.config = config;
  }

  getDefaultProvider() {
    return this.config.defaultProvider || 'anthropic';
  }

  getDefaultModel() {
    return this.config.defaultModel || 'claude-3-5-sonnet-latest';
  }

  listModels({ provider } = {}) {
    return catalog.filter((model) => !provider || model.provider === provider);
  }

  getModelConfig(provider, model) {
    return {
      provider: provider || this.getDefaultProvider(),
      model: model || this.getDefaultModel(),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      timeoutMs: this.config.requestTimeoutMs,
      streaming: this.config.enableStreaming,
      maxRetries: this.config.maxRetries,
    };
  }
}
