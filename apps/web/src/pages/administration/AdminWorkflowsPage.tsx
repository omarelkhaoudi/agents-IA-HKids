import { useEffect, useMemo, useState } from 'react';
import {
  archiveWorkflowDefinition,
  cloneWorkflowDefinition,
  createWorkflowDefinition,
  getAdminWorkflowAnalytics,
  getAdminWorkflowDashboard,
  getWorkflowApprovalTasks,
  getWorkflowDefinitions,
  getWorkflowTemplates,
  publishWorkflowDefinition,
  simulateWorkflow,
} from '../../api/admin';
import type {
  WorkflowAnalytics,
  WorkflowApprovalTask,
  WorkflowDashboard,
  WorkflowDefinition,
  WorkflowSimulation,
  WorkflowTemplate,
} from '../../types/workflow-governance';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import MetricCard from '../../components/ui/MetricCard';
import Panel from '../../components/ui/Panel';
import Skeleton from '../../components/ui/Skeleton';

function statusTone(status = ''): 'neutral' | 'success' | 'info' | 'warning' | 'purple' {
  if (['published', 'Approved', 'Exported', 'approved', 'active'].includes(status)) return 'success';
  if (['draft', 'Pending Review', 'pending'].includes(status)) return 'info';
  if (['Rejected', 'rejected', 'overdue', 'failed'].includes(status)) return 'warning';
  if (['archived', 'deprecated'].includes(status)) return 'purple';
  return 'neutral';
}

function formatMinutes(value?: number) {
  const minutes = Number(value || 0);
  if (!minutes) return '0 min';
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} d`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} h`;
  return `${minutes} min`;
}

function formatDate(value?: string) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function historyState(item: WorkflowDashboard['approvalHistory'][number]) {
  return item.newState || item.new_state || 'Workflow event';
}

function previousState(item: WorkflowDashboard['approvalHistory'][number]) {
  return item.previousState || item.previous_state || 'Created';
}

export default function AdminWorkflowsPage() {
  const [dashboard, setDashboard] = useState<WorkflowDashboard | null>(null);
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null);
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [approvals, setApprovals] = useState<WorkflowApprovalTask[]>([]);
  const [simulation, setSimulation] = useState<WorkflowSimulation | null>(null);
  const [selectedTemplateCode, setSelectedTemplateCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.code === selectedTemplateCode) || templates[0],
    [selectedTemplateCode, templates]
  );

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [nextDashboard, nextAnalytics, nextDefinitions, nextTemplates, nextApprovals] =
        await Promise.all([
          getAdminWorkflowDashboard(),
          getAdminWorkflowAnalytics(),
          getWorkflowDefinitions(),
          getWorkflowTemplates(),
          getWorkflowApprovalTasks({ status: 'pending' }),
        ]);
      setDashboard(nextDashboard);
      setAnalytics(nextAnalytics);
      setDefinitions(nextDefinitions.items);
      setTemplates(nextTemplates.items);
      setApprovals(nextApprovals.items);
      setSelectedTemplateCode((current) => current || nextTemplates.items[0]?.code || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load workflow governance.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runSimulation(template = selectedTemplate) {
    if (!template) return;
    setBusy(true);
    setNotice('');
    try {
      setSimulation(
        await simulateWorkflow({
          definition: {
            ...template.definition,
            name: template.name,
            code: template.code,
            category: template.category,
            description: template.description,
          },
        })
      );
      setNotice('Workflow simulation completed.');
    } finally {
      setBusy(false);
    }
  }

  async function createFromTemplate(template: WorkflowTemplate) {
    setBusy(true);
    setNotice('');
    try {
      const definition = template.definition || {};
      await createWorkflowDefinition({
        ...definition,
        name: `${template.name} Draft`,
        code: `${template.code}-${Date.now()}`,
        category: template.category,
        description: template.description,
        tags: template.tags || [],
        owner: template.owner || 'Workflow Governance',
        status: 'draft',
        priority: definition.priority || 'normal',
        executionMode: definition.executionMode || 'sequential',
        approvalStrategy: definition.approvalStrategy || 'all_required',
        approvalChain: definition.approvalChain || [],
        conditions: definition.conditions || [],
        sla: definition.sla || {},
        escalationRules: definition.escalationRules || [],
        metadata: { ...(definition.metadata || {}), templateCode: template.code },
      });
      setNotice('Draft workflow definition created from template.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function runDefinitionAction(id: string, action: 'publish' | 'archive' | 'clone') {
    setBusy(true);
    setNotice('');
    try {
      if (action === 'publish') await publishWorkflowDefinition(id);
      if (action === 'archive') await archiveWorkflowDefinition(id);
      if (action === 'clone') await cloneWorkflowDefinition(id);
      setNotice(`Workflow ${action} completed.`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Panel className="p-6">
          <Skeleton className="h-8 w-64" />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </Panel>
      </div>
    );
  }

  if (error || !dashboard || !analytics) {
    return <Panel className="p-10 text-center text-sm text-rose-300">{error || 'Unavailable'}</Panel>;
  }

  const metric = dashboard.metrics;

  return (
    <div className="space-y-6">
      {notice ? <Panel className="border-cyan-400/20 p-4 text-sm text-cyan-200">{notice}</Panel> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Running workflows" value={String(metric.running)} accent="cyan" />
        <MetricCard label="Pending approvals" value={String(metric.pendingApprovals)} accent="orange" />
        <MetricCard label="Approved" value={String(metric.approved)} accent="emerald" />
        <MetricCard label="Rejected" value={String(metric.rejected)} accent="purple" />
        <MetricCard label="Overdue" value={String(metric.overdue)} accent="orange" />
        <MetricCard label="Escalated" value={String(metric.escalated)} accent="purple" />
        <MetricCard label="SLA compliance" value={`${metric.slaCompliance}%`} accent="blue" />
        <MetricCard label="Workflow health" value={`${metric.workflowHealth}%`} accent="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Workflow Designer</h2>
              <p className="mt-1 text-sm text-slate-400">Templates, approval chain, SLA and simulation.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedTemplateCode}
                onChange={(event) => setSelectedTemplateCode(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.code}>
                    {template.name}
                  </option>
                ))}
              </select>
              <Button size="sm" disabled={busy || !selectedTemplate} onClick={() => void runSimulation()}>
                Simulate
              </Button>
              {selectedTemplate ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void createFromTemplate(selectedTemplate)}
                >
                  Create draft
                </Button>
              ) : null}
            </div>
          </div>

          {selectedTemplate ? (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{selectedTemplate.category}</Badge>
                <Badge>{selectedTemplate.status}</Badge>
                {(selectedTemplate.tags || []).slice(0, 4).map((tag) => (
                  <Badge key={tag} tone="purple">
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-sm leading-6 text-slate-300">{selectedTemplate.description}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {(selectedTemplate.definition.approvalChain || []).map((level, index) => (
                  <div key={`${level.levelName}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{level.levelName || `Level ${index + 1}`}</p>
                      <Badge tone={level.required === false ? 'neutral' : 'success'}>
                        {level.required === false ? 'optional' : 'required'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {level.approverType || 'role'} - {formatMinutes(level.timeoutMinutes)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(level.approvers || []).map((approver) => (
                        <span key={approver} className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
                          {approver}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No workflow templates available.</p>
          )}
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Simulation</h2>
          {simulation ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Estimated duration"
                  value={formatMinutes(simulation.estimatedDurationMinutes)}
                  accent="cyan"
                />
                <MetricCard
                  label="SLA prediction"
                  value={simulation.slaPrediction.likelyBreach ? 'Risk' : 'OK'}
                  accent={simulation.slaPrediction.likelyBreach ? 'orange' : 'emerald'}
                />
              </div>
              <div className="space-y-2">
                {simulation.executionPath.map((step, index) => (
                  <div key={`${step}-${index}`} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-semibold text-cyan-200">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              {simulation.warnings.length ? (
                <div className="rounded-lg border border-orange-400/20 bg-orange-500/10 p-3 text-sm text-orange-200">
                  {simulation.warnings.join(' ')}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Run a template simulation to inspect path, SLA and bottlenecks.</p>
          )}
        </Panel>
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Definitions & Versioning</h2>
          <Badge tone="info">{definitions.length} definitions</Badge>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="py-2 pr-4">Workflow</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Version</th>
                <th className="py-2 pr-4">Mode</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {definitions.length ? (
                definitions.map((definition) => (
                  <tr key={definition.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{definition.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{definition.code}</p>
                    </td>
                    <td className="py-3 pr-4">{definition.category}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={statusTone(definition.status)}>{definition.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      v{definition.currentVersion}
                      {definition.publishedVersion ? ` / published v${definition.publishedVersion}` : ''}
                    </td>
                    <td className="py-3 pr-4">{definition.executionMode}</td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          disabled={busy || definition.status === 'published'}
                          onClick={() => void runDefinitionAction(definition.id, 'publish')}
                        >
                          Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void runDefinitionAction(definition.id, 'clone')}
                        >
                          Clone
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy || definition.status === 'archived'}
                          onClick={() => void runDefinitionAction(definition.id, 'archive')}
                        >
                          Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-5 text-slate-500" colSpan={6}>
                    No workflow definitions yet. Create a draft from a template.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Approval KPIs</h2>
          <div className="mt-4 grid gap-3">
            <MetricCard label="Approval rate" value={`${analytics.approvalKpis.approvalRate}%`} accent="emerald" />
            <MetricCard label="Average approval" value={formatMinutes(analytics.approvalKpis.averageApprovalTimeMinutes)} />
            <MetricCard label="SLA overdue" value={String(analytics.slaKpis.overdue)} accent="orange" />
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Top Workflows</h2>
          <div className="mt-4 space-y-3">
            {dashboard.topWorkflows.length ? dashboard.topWorkflows.map((item) => (
              <div key={item.workflow} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <span className="text-sm text-slate-300">{item.workflow || 'Unassigned'}</span>
                <Badge tone="info">{item.total}</Badge>
              </div>
            )) : <p className="text-sm text-slate-500">No workflow usage yet.</p>}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Top Approvers</h2>
          <div className="mt-4 space-y-3">
            {dashboard.topApprovers.length ? dashboard.topApprovers.map((item) => (
              <div key={item.reviewer || 'unknown'} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <span className="text-sm text-slate-300">{item.reviewer || 'Unassigned'}</span>
                <Badge tone="purple">{item.total}</Badge>
              </div>
            )) : <p className="text-sm text-slate-500">No approver activity yet.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Pending Approval Queue</h2>
          <div className="mt-4 space-y-3">
            {approvals.length ? approvals.slice(0, 10).map((task) => (
              <div key={task.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{task.levelName}</p>
                  <Badge tone={statusTone(task.status)}>{task.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">{task.reviewer || task.reviewerRole || 'Unassigned'}</p>
                <p className="mt-1 text-xs text-slate-500">Due {formatDate(task.dueAt)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No pending approval tasks.</p>}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Approval Timeline</h2>
          <div className="mt-4 space-y-3">
            {dashboard.approvalHistory.length ? dashboard.approvalHistory.slice(0, 12).map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">
                    {previousState(item)} to {historyState(item)}
                  </p>
                  <Badge tone={statusTone(historyState(item))}>{historyState(item)}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {item.actor || 'system'} - {formatDate(item.createdAt || item.created_at)}
                </p>
                {item.comment ? <p className="mt-2 text-sm text-slate-400">{item.comment}</p> : null}
              </div>
            )) : <p className="text-sm text-slate-500">No workflow history recorded yet.</p>}
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <h2 className="text-lg font-semibold text-white">Daily Trend</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-7">
          {dashboard.trends.daily.slice(-14).map((item) => {
            const max = Math.max(...dashboard.trends.daily.map((entry) => entry.total), 1);
            return (
              <div key={item.bucket} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div
                  className="mb-3 h-1.5 rounded-full bg-cyan-300"
                  style={{ width: `${Math.max(8, (item.total / max) * 100)}%` }}
                />
                <p className="text-xs text-slate-500">{item.bucket}</p>
                <p className="mt-1 text-lg font-semibold text-white">{item.total}</p>
              </div>
            );
          })}
          {!dashboard.trends.daily.length ? <p className="text-sm text-slate-500">No trend data yet.</p> : null}
        </div>
      </Panel>
    </div>
  );
}
