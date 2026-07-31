import { env } from '../config/env.js';
import { ObservabilityRepository } from '../repositories/ObservabilityRepository.js';
import { ActiveRequestTracker } from '../services/observability/ActiveRequestTracker.js';
import { AlertService } from '../services/observability/AlertService.js';
import { InstrumentationBridge } from '../services/observability/InstrumentationBridge.js';
import { ObservabilityService } from '../services/observability/ObservabilityService.js';
import { SystemHealthMonitor } from '../services/observability/SystemHealthMonitor.js';
import { dashboardService } from './admin-runtime.js';
import { aiGateway, persistenceService, retrievalService } from './assistant-runtime.js';
import { healthService } from './health-runtime.js';
import { logger } from '../utils/logger.js';

const observabilityRepository = new ObservabilityRepository(persistenceService.pool);

export const activeRequestTracker = new ActiveRequestTracker({
  capacity: env.aiConcurrencyCapacity,
});

export const systemHealthMonitor = new SystemHealthMonitor({
  healthService,
  observabilityRepository,
  activeRequestTracker,
});

export const alertService = new AlertService({
  observabilityRepository,
  systemHealthMonitor,
});

export const observabilityService = new ObservabilityService({
  observabilityRepository,
  systemHealthMonitor,
  alertService,
  activeRequestTracker,
  dashboardService,
});

const instrumentationBridge = new InstrumentationBridge({ observabilityService });

instrumentationBridge.instrumentAiGateway(aiGateway, activeRequestTracker);
instrumentationBridge.instrumentRetrieval(retrievalService);

export async function initializeObservabilityRuntime() {
  try {
    await observabilityService.recordEvent({
      eventType: 'platform_started',
      category: 'system',
      severity: 'info',
      source: 'runtime',
      actor: 'system',
      summary: 'Observability runtime initialized.',
      metadata: { nodeEnv: env.nodeEnv },
    });
  } catch (error) {
    logger.warn('observability_runtime_start_failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }
}
