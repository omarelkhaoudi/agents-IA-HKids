import { env } from '../../config/env.js';

function normalizeText(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, ' ');
}

function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function hashToken(token, dimensions) {
  let hash = 0;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }

  return hash % dimensions;
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export class EmbeddingService {
  constructor({
    provider = env.embeddingProvider || 'mock',
    model = env.embeddingModel || 'mock-hash-v1',
    dimensions = 128,
  } = {}) {
    this.provider = provider;
    this.model = model;
    this.dimensions = dimensions;
    this.cache = new Map();
  }

  generateEmbedding(text) {
    const cacheKey = `${this.provider}:${this.model}:${text}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const embedding = this.generateProviderEmbedding(text);
    this.cache.set(cacheKey, embedding);
    return embedding;
  }

  generateProviderEmbedding(text) {
    switch (this.provider) {
      case 'mock':
      case 'local':
      case 'openai':
      case 'anthropic':
        return this.generateDeterministicEmbedding(text);
      default:
        return this.generateDeterministicEmbedding(text);
    }
  }

  generateDeterministicEmbedding(text) {
    const tokens = tokenize(text);
    const vector = new Array(this.dimensions).fill(0);

    tokens.forEach((token) => {
      const index = hashToken(token, this.dimensions);
      vector[index] += 1;
    });

    return normalizeVector(vector);
  }
}
