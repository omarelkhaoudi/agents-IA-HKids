export class ProviderManager {
  constructor(providerFactory) {
    this.providerFactory = providerFactory;
  }

  listProviders() {
    return [
      {
        id: 'anthropic',
        label: 'Anthropic Claude',
        available: true,
        default: true,
      },
      {
        id: 'openai',
        label: 'OpenAI',
        available: false,
        default: false,
      },
      {
        id: 'gemini',
        label: 'Google Gemini',
        available: false,
        default: false,
      },
      {
        id: 'ollama',
        label: 'Ollama',
        available: false,
        default: false,
      },
    ];
  }

  getProvider(providerName = 'anthropic') {
    return this.providerFactory.createProvider(providerName);
  }
}
