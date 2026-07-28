export class StreamingManager {
  constructor({ enabled = false } = {}) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  async streamResponse({ providerClient, payload, onChunk }) {
    if (!this.enabled) {
      throw new Error('Streaming is disabled. Set ENABLE_STREAMING=true to enable it.');
    }

    if (typeof providerClient.generateStreamingResponse !== 'function') {
      throw new Error('Selected provider does not support streaming yet.');
    }

    return providerClient.generateStreamingResponse({
      ...payload,
      onChunk,
    });
  }
}
