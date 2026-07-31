import os from 'node:os';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STORAGE_ROOT = path.resolve(__dirname, '..', '..', '..', 'storage');

async function directoryBytes(directory) {
  let total = 0;

  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      total += await directoryBytes(entryPath);
      continue;
    }

    try {
      const stats = await stat(entryPath);
      total += stats.size;
    } catch {
      total += 0;
    }
  }

  return total;
}

function toMegabytes(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(3));
}

/**
 * Enriches the existing HealthService checks with process level metrics
 * (memory, CPU, uptime) and per-module readiness for the enterprise modules.
 */
export class SystemHealthMonitor {
  constructor({
    healthService,
    observabilityRepository,
    activeRequestTracker,
    storageRoot = DEFAULT_STORAGE_ROOT,
    storageQuotaMegabytes = env.storageQuotaMegabytes,
  }) {
    this.healthService = healthService;
    this.observabilityRepository = observabilityRepository;
    this.activeRequestTracker = activeRequestTracker;
    this.storageRoot = storageRoot;
    this.storageQuotaMegabytes = Math.max(1, Number(storageQuotaMegabytes) || 1);
    this.lastCpuSample = { usage: process.cpuUsage(), timestamp: Date.now() };
  }

  getMemoryUsage() {
    const memory = process.memoryUsage();
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;

    return {
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      rssBytes: memory.rss,
      externalBytes: memory.external,
      heapUsedMegabytes: toMegabytes(memory.heapUsed),
      rssMegabytes: toMegabytes(memory.rss),
      systemTotalMegabytes: toMegabytes(totalBytes),
      systemFreeMegabytes: toMegabytes(freeBytes),
      systemUsedPercent: totalBytes ? Number(((usedBytes / totalBytes) * 100).toFixed(2)) : 0,
      heapUsedPercent: memory.heapTotal
        ? Number(((memory.heapUsed / memory.heapTotal) * 100).toFixed(2))
        : 0,
    };
  }

  getCpuUsage() {
    const now = Date.now();
    const usage = process.cpuUsage(this.lastCpuSample.usage);
    const elapsedMs = Math.max(1, now - this.lastCpuSample.timestamp);
    const cores = Math.max(1, os.cpus()?.length || 1);
    const usedMs = (usage.user + usage.system) / 1000;
    const processPercent = Number(
      Math.min(100, (usedMs / (elapsedMs * cores)) * 100).toFixed(2)
    );

    this.lastCpuSample = { usage: process.cpuUsage(), timestamp: now };

    const [loadAverage1m = 0] = os.loadavg();

    return {
      cores,
      processUsagePercent: processPercent,
      loadAverage1m: Number(loadAverage1m.toFixed(2)),
      loadPercent: Number(Math.min(100, (loadAverage1m / cores) * 100).toFixed(2)),
      platform: process.platform,
    };
  }

  getUptime() {
    return {
      processUptimeSeconds: Math.round(process.uptime()),
      systemUptimeSeconds: Math.round(os.uptime()),
      serviceUptimeSeconds: this.healthService.getUptimeSeconds(),
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    };
  }

  async getStorage(moduleCounts) {
    const diskBytes = await directoryBytes(this.storageRoot);
    const databaseBytes = moduleCounts?.storedBytes || 0;
    const usedMegabytes = toMegabytes(diskBytes + databaseBytes);
    const usedPercent = Number(
      Math.min(100, (usedMegabytes / this.storageQuotaMegabytes) * 100).toFixed(2)
    );

    return {
      status: usedPercent >= 100 ? 'error' : usedPercent >= env.alertStoragePercent ? 'degraded' : 'ok',
      diskMegabytes: toMegabytes(diskBytes),
      databaseMegabytes: toMegabytes(databaseBytes),
      usedMegabytes,
      quotaMegabytes: this.storageQuotaMegabytes,
      usedPercent,
      storedFiles: moduleCounts?.storedFiles || 0,
      root: this.storageRoot,
    };
  }

  async getSystemHealth() {
    const [health, moduleCounts, pendingApprovals] = await Promise.all([
      this.healthService.getHealth(),
      this.observabilityRepository.getModuleCounts(),
      this.observabilityRepository.getPendingApprovalCount(),
    ]);

    const storage = await this.getStorage(moduleCounts);

    const modules = {
      database: health.checks.database,
      aiGateway: health.checks.aiGateway,
      retrieval: health.checks.retrieval,
      workflow: {
        ...health.checks.workflow,
        instances: moduleCounts.workflows,
        pendingApprovals,
      },
      knowledgePlatform: {
        status: 'ok',
        documents: moduleCounts.knowledgeDocuments,
        collections: moduleCounts.knowledgeCollections,
      },
      promptPlatform: {
        status: 'ok',
        prompts: moduleCounts.prompts,
        libraries: moduleCounts.promptLibraries,
      },
      dms: {
        status: 'ok',
        folders: moduleCounts.folders,
        files: moduleCounts.storedFiles,
      },
      storage,
    };

    const degraded = Object.values(modules).some((module) => module.status !== 'ok');

    return {
      status: health.status === 'ok' && !degraded ? 'ok' : 'degraded',
      version: health.version,
      nodeEnv: env.nodeEnv,
      modules,
      memory: this.getMemoryUsage(),
      cpu: this.getCpuUsage(),
      uptime: this.getUptime(),
      queue: this.activeRequestTracker.getQueueStatus(),
      checkedAt: new Date().toISOString(),
    };
  }
}
