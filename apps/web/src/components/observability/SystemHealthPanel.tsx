import type { ModuleHealth, SystemHealth } from '../../types/observability';
import Badge from '../ui/Badge';
import MetricCard from '../ui/MetricCard';
import Panel from '../ui/Panel';
import {
  formatBytes,
  formatPercent,
  formatTimestamp,
  formatUptime,
  healthTone,
} from '../../utils/observabilityFormat';

const moduleLabels: Record<string, string> = {
  database: 'Database',
  aiGateway: 'AI Gateway',
  retrieval: 'Retrieval',
  workflow: 'Workflow',
  knowledgePlatform: 'Knowledge Platform',
  promptPlatform: 'Prompt Platform',
  dms: 'Document Management',
  storage: 'Storage',
};

function moduleDetail(name: string, module: ModuleHealth): string {
  switch (name) {
    case 'database':
      return `Latency ${module.latencyMs ?? 0} ms`;
    case 'aiGateway':
      return `Default ${String(module.defaultModel ?? 'unknown')}`;
    case 'retrieval':
      return `${module.chunks ?? 0} indexed chunks`;
    case 'workflow':
      return `${module.instances ?? 0} instances, ${module.pendingApprovals ?? 0} pending approvals`;
    case 'knowledgePlatform':
      return `${module.documents ?? 0} documents in ${module.collections ?? 0} collections`;
    case 'promptPlatform':
      return `${module.prompts ?? 0} prompts in ${module.libraries ?? 0} libraries`;
    case 'dms':
      return `${module.files ?? 0} files across ${module.folders ?? 0} folders`;
    case 'storage':
      return `${module.usedMegabytes ?? 0} MB of ${module.quotaMegabytes ?? 0} MB`;
    default:
      return String(module.message ?? '');
  }
}

interface SystemHealthPanelProps {
  health: SystemHealth;
}

export default function SystemHealthPanel({ health }: SystemHealthPanelProps) {
  const storage = health.modules.storage;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Platform status"
          value={health.status}
          hint={`${health.nodeEnv} · version ${health.version}`}
          accent={health.status === 'ok' ? 'emerald' : 'orange'}
        />
        <MetricCard
          label="Uptime"
          value={formatUptime(health.uptime.processUptimeSeconds)}
          hint={`Since ${formatTimestamp(health.uptime.startedAt)}`}
          accent="cyan"
        />
        <MetricCard
          label="Memory"
          value={formatBytes(health.memory.heapUsedBytes)}
          hint={`Heap ${formatPercent(health.memory.heapUsedPercent)} · RSS ${formatBytes(
            health.memory.rssBytes
          )}`}
          accent="purple"
        />
        <MetricCard
          label="CPU"
          value={formatPercent(health.cpu.processUsagePercent)}
          hint={`${health.cpu.cores} cores on ${health.cpu.platform}`}
          accent="blue"
        />
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Module health</h2>
            <p className="mt-1 text-sm text-slate-400">
              Readiness of every enterprise module, checked at {formatTimestamp(health.checkedAt)}.
            </p>
          </div>
          <Badge tone={healthTone(health.status)}>{health.status}</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(health.modules).map(([name, module]) => (
            <article
              key={name}
              className="rounded-[1.25rem] border border-white/8 bg-white/4 p-4 transition hover:border-cyan-400/25"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{moduleLabels[name] || name}</p>
                <Badge tone={healthTone(module.status)}>{module.status}</Badge>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">{moduleDetail(name, module)}</p>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Storage capacity</h2>
          <p className="mt-1 text-sm text-slate-400">
            Combined document storage on disk and inside PostgreSQL.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>{storage.usedMegabytes} MB used</span>
              <span>{storage.quotaMegabytes} MB quota</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={[
                  'h-full transition-all',
                  storage.usedPercent >= 85 ? 'bg-orange-400' : 'bg-cyan-400',
                ].join(' ')}
                style={{ width: `${Math.min(100, storage.usedPercent)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {formatPercent(storage.usedPercent)} consumed across {storage.storedFiles} stored files.
            </p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/8 pt-5 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">On disk</dt>
              <dd className="mt-1 text-white">{storage.diskMegabytes} MB</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">In database</dt>
              <dd className="mt-1 text-white">{storage.databaseMegabytes} MB</dd>
            </div>
          </dl>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Runtime resources</h2>
          <p className="mt-1 text-sm text-slate-400">
            Process and host metrics collected from the Node.js runtime.
          </p>

          <dl className="mt-5 space-y-4 text-sm">
            <ResourceRow
              label="Heap used"
              value={`${formatBytes(health.memory.heapUsedBytes)} of ${formatBytes(
                health.memory.heapTotalBytes
              )}`}
              percent={health.memory.heapUsedPercent}
            />
            <ResourceRow
              label="System memory"
              value={`${health.memory.systemFreeMegabytes} MB free of ${health.memory.systemTotalMegabytes} MB`}
              percent={health.memory.systemUsedPercent}
            />
            <ResourceRow
              label="Process CPU"
              value={`${formatPercent(health.cpu.processUsagePercent)} across ${health.cpu.cores} cores`}
              percent={health.cpu.processUsagePercent}
            />
            <ResourceRow
              label="Gateway queue"
              value={`${health.queue.inFlight} in flight, ${health.queue.queued} queued`}
              percent={health.queue.saturationPercent}
            />
          </dl>

          <p className="mt-6 text-xs text-slate-500">
            System uptime {formatUptime(health.uptime.systemUptimeSeconds)} · service uptime{' '}
            {formatUptime(health.uptime.serviceUptimeSeconds)}
          </p>
        </Panel>
      </div>
    </div>
  );
}

function ResourceRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <dt className="text-slate-300">{label}</dt>
        <dd className="text-slate-400">{value}</dd>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-cyan-400/80 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
