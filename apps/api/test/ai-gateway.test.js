import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { AIGateway } from '../src/services/ai-gateway/AIGateway.js';
import { CostEstimator } from '../src/services/ai-gateway/CostEstimator.js';
import { ModelManager } from '../src/services/ai-gateway/ModelManager.js';
import { ProviderManager } from '../src/services/ai-gateway/ProviderManager.js';
import { RetryManager } from '../src/services/ai-gateway/RetryManager.js';
import { StreamingManager } from '../src/services/ai-gateway/StreamingManager.js';
import { TimeoutManager } from '../src/services/ai-gateway/TimeoutManager.js';
import { TokenCounter } from '../src/services/ai-gateway/TokenCounter.js';
import { UsageLogger } from '../src/services/ai-gateway/UsageLogger.js';

async function createGateway() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const gateway = new AIGateway({
    providerManager: new ProviderManager({
      createProvider() {
        return {
          async generateResponse() {
            return { text: 'Gateway assistant response.' };
          },
        };
      },
    }),
    modelManager: new ModelManager({
      defaultProvider: 'anthropic',
      defaultModel: 'claude-3-5-sonnet-latest',
      temperature: 0.3,
      maxTokens: 1500,
      requestTimeoutMs: 5000,
      enableStreaming: false,
      maxRetries: 1,
    }),
    tokenCounter: new TokenCounter(),
    costEstimator: new CostEstimator(),
    retryManager: new RetryManager({ maxRetries: 1 }),
    timeoutManager: new TimeoutManager({ timeoutMs: 5000 }),
    usageLogger: new UsageLogger({ pool, enabled: true }),
    streamingManager: new StreamingManager({ enabled: false }),
  });

  return { gateway, pool };
}

test('TokenCounter estimates prompt and completion tokens', () => {
  const counter = new TokenCounter();
  assert.ok(counter.estimate('abcd') >= 1);
  assert.ok(counter.estimateMessages('system', [{ role: 'user', content: 'hello' }]) >= 1);
});

test('CostEstimator returns a numeric estimated cost', () => {
  const estimator = new CostEstimator();
  const cost = estimator.estimate({
    model: 'claude-3-5-sonnet-latest',
    promptTokens: 1000,
    completionTokens: 500,
  });
  assert.equal(typeof cost, 'number');
  assert.ok(cost > 0);
});

test('RetryManager retries failed operations', async () => {
  const retryManager = new RetryManager({ maxRetries: 2 });
  let attempts = 0;

  const result = await retryManager.execute(async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new Error('temporary failure');
    }
    return 'ok';
  });

  assert.equal(result, 'ok');
  assert.equal(attempts, 2);
});

test('AIGateway generates responses and logs usage', async () => {
  const { gateway } = await createGateway();

  const response = await gateway.generate({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    systemPrompt: 'Be concise.',
    messages: [{ role: 'user', content: 'Hello' }],
    conversationId: 'session-001',
    userId: 'user-001',
  });

  assert.equal(response.text, 'Gateway assistant response.');
  assert.equal(response.usage.status, 'success');
  assert.ok(response.usage.totalTokens > 0);

  const statistics = await gateway.getStatistics();
  assert.equal(statistics.totalRequests, 1);
  assert.ok(statistics.totalTokens > 0);

  const usage = await gateway.listUsage({ provider: 'anthropic' });
  assert.equal(usage.length, 1);
  assert.equal(usage[0].provider, 'anthropic');
});

test('ProviderManager exposes extensible providers', () => {
  const manager = new ProviderManager({
    createProvider() {
      return {};
    },
  });
  const providers = manager.listProviders();
  assert.ok(providers.some((item) => item.id === 'anthropic' && item.default));
  assert.ok(providers.some((item) => item.id === 'openai'));
  assert.ok(providers.some((item) => item.id === 'gemini'));
  assert.ok(providers.some((item) => item.id === 'ollama'));
});
