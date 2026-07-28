export class AIGateway {
  constructor({
    providerManager,
    modelManager,
    tokenCounter,
    costEstimator,
    retryManager,
    timeoutManager,
    usageLogger,
    streamingManager,
  }) {
    this.providerManager = providerManager;
    this.modelManager = modelManager;
    this.tokenCounter = tokenCounter;
    this.costEstimator = costEstimator;
    this.retryManager = retryManager;
    this.timeoutManager = timeoutManager;
    this.usageLogger = usageLogger;
    this.streamingManager = streamingManager;
  }

  listProviders() {
    return this.providerManager.listProviders();
  }

  listModels(filters) {
    return this.modelManager.listModels(filters);
  }

  getCurrentConfiguration() {
    return {
      provider: this.modelManager.getDefaultProvider(),
      model: this.modelManager.getDefaultModel(),
      ...this.modelManager.getModelConfig(),
    };
  }

  async listUsage(filters) {
    return this.usageLogger.listUsage(filters);
  }

  async getStatistics() {
    return this.usageLogger.getStatistics();
  }

  async generate({
    provider,
    model,
    systemPrompt,
    messages,
    conversationId,
    userId,
    agentCode,
    stream = false,
    onChunk,
  }) {
    const resolvedProvider = provider || this.modelManager.getDefaultProvider();
    const resolvedModel = model || this.modelManager.getDefaultModel();
    const modelConfig = this.modelManager.getModelConfig(resolvedProvider, resolvedModel);
    const providerClient = this.providerManager.getProvider(resolvedProvider);
    const promptTokens = this.tokenCounter.estimateMessages(systemPrompt, messages);
    const startedAt = Date.now();

    try {
      let response;

      if (stream && this.streamingManager.isEnabled()) {
        response = await this.retryManager.execute(
          () =>
            this.timeoutManager.execute(
              () =>
                this.streamingManager.streamResponse({
                  providerClient,
                  payload: {
                    model: resolvedModel,
                    systemPrompt,
                    messages,
                    maxTokens: modelConfig.maxTokens,
                    temperature: modelConfig.temperature,
                  },
                  onChunk,
                }),
              { timeoutMs: modelConfig.timeoutMs }
            ),
          { maxRetries: modelConfig.maxRetries }
        );
      } else {
        response = await this.retryManager.execute(
          () =>
            this.timeoutManager.execute(
              () =>
                providerClient.generateResponse({
                  model: resolvedModel,
                  systemPrompt,
                  messages,
                  maxTokens: modelConfig.maxTokens,
                  temperature: modelConfig.temperature,
                }),
              { timeoutMs: modelConfig.timeoutMs }
            ),
          { maxRetries: modelConfig.maxRetries }
        );
      }

      const completionTokens = this.tokenCounter.estimate(response.text || '');
      const totalTokens = promptTokens + completionTokens;
      const durationMs = Date.now() - startedAt;
      const estimatedCost = this.costEstimator.estimate({
        model: resolvedModel,
        promptTokens,
        completionTokens,
      });

      const usage = {
        id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        provider: resolvedProvider,
        model: resolvedModel,
        conversationId,
        userId,
        agentCode: agentCode || 'administrative-assistant',
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        durationMs,
        status: 'success',
        errorMessage: null,
      };

      await this.usageLogger.log(usage);

      return {
        text: response.text,
        raw: response.raw,
        usage,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const usage = {
        id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        provider: resolvedProvider,
        model: resolvedModel,
        conversationId,
        userId,
        agentCode: agentCode || 'administrative-assistant',
        promptTokens,
        completionTokens: 0,
        totalTokens: promptTokens,
        estimatedCost: 0,
        durationMs,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown AI gateway error.',
      };

      await this.usageLogger.log(usage);
      throw error;
    }
  }
}
