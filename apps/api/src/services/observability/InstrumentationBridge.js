import { logger } from '../../utils/logger.js';

/**
 * Attaches observability probes to already constructed runtime singletons.
 * Domain services keep their contracts: the bridge only wraps the call, records
 * an event and rethrows, so behaviour is unchanged when observability is off.
 */
export class InstrumentationBridge {
  constructor({ observabilityService }) {
    this.observabilityService = observabilityService;
    this.instrumented = new WeakSet();
  }

  record(payload) {
    return this.observabilityService.recordEvent(payload).catch((error) => {
      logger.debug('observability_event_dropped', {
        eventType: payload.eventType,
        message: error instanceof Error ? error.message : 'unknown error',
      });
      return null;
    });
  }

  instrumentRetrieval(retrievalService) {
    if (!retrievalService || this.instrumented.has(retrievalService)) {
      return retrievalService;
    }

    const original = retrievalService.retrieveRelevantContext.bind(retrievalService);
    const bridge = this;

    retrievalService.retrieveRelevantContext = function retrieveRelevantContext(question) {
      const startedAt = Date.now();

      try {
        return original(question);
      } catch (error) {
        void bridge.record({
          eventType: 'retrieval_failed',
          category: 'retrieval',
          severity: 'warning',
          source: 'retrieval-service',
          summary: error instanceof Error ? error.message : 'Retrieval failed.',
          durationMs: Date.now() - startedAt,
          metadata: {},
        });

        throw error;
      }
    };

    this.instrumented.add(retrievalService);
    return retrievalService;
  }

  instrumentAiGateway(aiGateway, activeRequestTracker) {
    if (!aiGateway || this.instrumented.has(aiGateway)) {
      return aiGateway;
    }

    aiGateway.activeRequestTracker = activeRequestTracker;
    this.instrumented.add(aiGateway);
    return aiGateway;
  }
}
