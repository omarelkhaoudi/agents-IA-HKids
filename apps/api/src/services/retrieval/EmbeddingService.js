import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';

const REMOTE_PROVIDERS = new Set(['openai', 'anthropic']);

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ');
}

function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function hashToken(token, dimensions) {
  const hash = createHash('sha256').update(token).digest();
  return hash.readUInt32BE(0) % dimensions;
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}

function vectorHash(vector) {
  return createHash('sha256').update(JSON.stringify(vector)).digest('hex');
}

function cacheKey(provider, model, text) {
  return `${provider}:${model}:${createHash('sha256').update(String(text || '')).digest('hex')}`;
}

function assertEmbeddingsPayload(payload, provider) {
  if (!Array.isArray(payload)) {
    throw new Error(`${provider} embedding response did not contain vectors.`);
  }

  payload.forEach((embedding, index) => {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(`${provider} embedding ${index + 1} is empty.`);
    }
    if (!embedding.every((value) => Number.isFinite(Number(value)))) {
      throw new Error(`${provider} embedding ${index + 1} contains non-numeric values.`);
    }
  });
}

export class EmbeddingService {
  constructor({
    provider = env.embeddingProvider || 'mock',
    model = env.embeddingModel || 'mock-hash-v1',
    dimensions = process.env.EMBEDDING_DIMENSIONS ? env.embeddingDimensions : undefined,
    batchSize = env.embeddingBatchSize || 16,
    cacheTtlMs = env.embeddingCacheTtlMs || 60 * 60 * 1000,
    fetchImpl = globalThis.fetch,
    config = env,
  } = {}) {
    this.provider = String(provider || 'mock').toLowerCase();
    this.model = model || (this.provider === 'openai' ? 'text-embedding-3-small' : 'local-bow-v1');
    this.dimensions = Number(dimensions) || (this.provider === 'mock' ? 128 : 384);
    this.batchSize = Math.max(1, Number(batchSize) || 16);
    this.cacheTtlMs = Number(cacheTtlMs) || 60 * 60 * 1000;
    this.fetchImpl = fetchImpl;
    this.config = config;
    this.cache = new Map();
    this.stats = {
      requests: 0,
      cacheHits: 0,
      failures: 0,
      totalLatencyMs: 0,
      lastError: '',
    };
  }

  getProviderInfo() {
    return {
      provider: this.provider,
      model: this.model,
      dimensions: this.dimensions,
      batchSize: this.batchSize,
      remote: REMOTE_PROVIDERS.has(this.provider),
      cacheSize: this.cache.size,
      stats: {
        ...this.stats,
        averageLatencyMs: this.stats.requests
          ? Math.round(this.stats.totalLatencyMs / this.stats.requests)
          : 0,
        cacheHitRatio: this.stats.requests
          ? Number(((this.stats.cacheHits / this.stats.requests) * 100).toFixed(2))
          : 0,
      },
    };
  }

  pruneCache(now = Date.now()) {
    for (const [key, item] of this.cache.entries()) {
      if (now - item.createdAt > this.cacheTtlMs) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    return { cleared: size };
  }

  getCached(text) {
    this.pruneCache();
    const item = this.cache.get(cacheKey(this.provider, this.model, text));
    if (!item) return null;
    this.stats.cacheHits += 1;
    return item.embedding;
  }

  setCached(text, embedding) {
    this.cache.set(cacheKey(this.provider, this.model, text), {
      embedding,
      createdAt: Date.now(),
    });
  }

  generateEmbedding(text) {
    const cached = this.getCached(text);
    if (cached) {
      return cached;
    }

    if (REMOTE_PROVIDERS.has(this.provider)) {
      return this.generateLocalEmbedding(text);
    }

    const embedding =
      this.provider === 'mock'
        ? this.generateMockEmbedding(text)
        : this.generateLocalEmbedding(text);
    this.setCached(text, embedding);
    return embedding;
  }

  async generateEmbeddingAsync(text) {
    const cached = this.getCached(text);
    if (cached) {
      return cached;
    }

    const [embedding] = await this.generateBatch([text]);
    return embedding.embedding;
  }

  async generateBatch(texts = []) {
    const normalizedTexts = texts.map((text) => String(text || ''));
    const results = new Array(normalizedTexts.length);
    const uncached = [];
    const uncachedIndexes = [];

    normalizedTexts.forEach((text, index) => {
      const cached = this.getCached(text);
      if (cached) {
        results[index] = {
          text,
          embedding: cached,
          provider: this.provider,
          model: this.model,
          dimensions: cached.length,
          latencyMs: 0,
          cacheHit: true,
          embeddingHash: vectorHash(cached),
        };
        return;
      }
      uncached.push(text);
      uncachedIndexes.push(index);
    });

    for (let index = 0; index < uncached.length; index += this.batchSize) {
      const batchTexts = uncached.slice(index, index + this.batchSize);
      const batchIndexes = uncachedIndexes.slice(index, index + this.batchSize);
      const startedAt = Date.now();
      let embeddings;

      try {
        embeddings = await this.generateProviderBatch(batchTexts);
        assertEmbeddingsPayload(embeddings, this.provider);
      } catch (error) {
        this.stats.failures += 1;
        this.stats.lastError = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        this.stats.requests += batchTexts.length;
      }

      const latencyMs = Date.now() - startedAt;
      this.stats.totalLatencyMs += latencyMs;

      embeddings.forEach((embedding, localIndex) => {
        const normalized = normalizeVector(embedding.map(Number));
        const originalIndex = batchIndexes[localIndex];
        const text = normalizedTexts[originalIndex];
        this.setCached(text, normalized);
        results[originalIndex] = {
          text,
          embedding: normalized,
          provider: this.provider,
          model: this.model,
          dimensions: normalized.length,
          latencyMs,
          cacheHit: false,
          embeddingHash: vectorHash(normalized),
        };
      });
    }

    return results;
  }

  async generateProviderBatch(texts) {
    switch (this.provider) {
      case 'openai':
        return this.generateOpenAiBatch(texts);
      case 'anthropic':
        return this.generateAnthropicCompatibleBatch(texts);
      case 'local':
        return this.generateLocalBatch(texts);
      case 'mock':
      default:
        return texts.map((text) => this.generateMockEmbedding(text));
    }
  }

  async generateOpenAiBatch(texts) {
    if (!this.config.openAiApiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI embeddings.');
    }
    if (!this.fetchImpl) {
      throw new Error('fetch is not available for OpenAI embeddings.');
    }

    const response = await this.fetchImpl(
      `${this.config.openAiEmbeddingBaseUrl || 'https://api.openai.com/v1'}/embeddings`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model || 'text-embedding-3-small',
          input: texts,
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenAI embeddings failed with ${response.status}: ${body.slice(0, 300)}`);
    }

    const payload = await response.json();
    return (payload.data || [])
      .sort((left, right) => Number(left.index || 0) - Number(right.index || 0))
      .map((item) => item.embedding);
  }

  async generateAnthropicCompatibleBatch(texts) {
    if (!this.config.anthropicEmbeddingBaseUrl) {
      throw new Error('ANTHROPIC_EMBEDDING_BASE_URL is required for Anthropic-compatible embeddings.');
    }
    if (!this.config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for Anthropic-compatible embeddings.');
    }
    if (!this.fetchImpl) {
      throw new Error('fetch is not available for Anthropic-compatible embeddings.');
    }

    const response = await this.fetchImpl(`${this.config.anthropicEmbeddingBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.anthropicApiKey,
        Authorization: `Bearer ${this.config.anthropicApiKey}`,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Anthropic-compatible embeddings failed with ${response.status}: ${body.slice(0, 300)}`
      );
    }

    const payload = await response.json();
    if (Array.isArray(payload.embeddings)) {
      return payload.embeddings;
    }
    return (payload.data || [])
      .sort((left, right) => Number(left.index || 0) - Number(right.index || 0))
      .map((item) => item.embedding);
  }

  async generateLocalBatch(texts) {
    if (this.config.localEmbeddingEndpoint && this.fetchImpl) {
      const response = await this.fetchImpl(this.config.localEmbeddingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, input: texts }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Local embedding endpoint failed with ${response.status}: ${body.slice(0, 300)}`);
      }

      const payload = await response.json();
      if (Array.isArray(payload.embeddings)) return payload.embeddings;
      return (payload.data || []).map((item) => item.embedding);
    }

    return texts.map((text) => this.generateLocalEmbedding(text));
  }

  generateMockEmbedding(text) {
    const tokens = tokenize(text);
    const vector = new Array(this.dimensions).fill(0);

    tokens.forEach((token) => {
      vector[hashToken(token, this.dimensions)] += 1;
    });

    return normalizeVector(vector);
  }

  generateLocalEmbedding(text) {
    const tokens = tokenize(text);
    const vector = new Array(this.dimensions).fill(0);
    const features = [];

    tokens.forEach((token, index) => {
      features.push(`w:${token}`);
      if (index < tokens.length - 1) {
        features.push(`b:${token}_${tokens[index + 1]}`);
      }
      if (token.length > 5) {
        features.push(`s:${token.slice(0, 5)}`);
      }
    });

    features.forEach((feature) => {
      const hash = createHash('sha256').update(feature).digest();
      const index = hash.readUInt32BE(0) % this.dimensions;
      const sign = hash[4] % 2 === 0 ? 1 : -1;
      vector[index] += sign;
    });

    return normalizeVector(vector);
  }
}

export { vectorHash };
