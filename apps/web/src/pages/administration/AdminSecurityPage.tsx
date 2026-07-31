import { useEffect, useState } from 'react';
import {
  getAdminSecurityDashboard,
  rotateAdminEncryptionKey,
  validateAdminSecrets,
} from '../../api/admin';
import type { SecurityDashboard } from '../../types/admin';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import MetricCard from '../../components/ui/MetricCard';
import Panel from '../../components/ui/Panel';
import Skeleton from '../../components/ui/Skeleton';

function toneForStatus(status: string): 'neutral' | 'success' | 'info' | 'warning' | 'purple' {
  if (status === 'healthy' || status === 'active') return 'success';
  if (status === 'missing' || status === 'expired' || status === 'critical') return 'warning';
  return 'neutral';
}

export default function AdminSecurityPage() {
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setDashboard(await getAdminSecurityDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load security dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runAction(action: 'secrets' | 'encryption') {
    setBusy(true);
    setNotice('');
    try {
      if (action === 'secrets') {
        await validateAdminSecrets();
        setNotice('Secret health validation completed.');
      } else {
        await rotateAdminEncryptionKey();
        setNotice('Encryption key rotation recorded.');
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Panel className="p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </Panel>
    );
  }

  if (error || !dashboard) {
    return <Panel className="p-10 text-center text-sm text-rose-300">{error || 'Unavailable'}</Panel>;
  }

  return (
    <div className="space-y-6">
      {notice ? <Panel className="border-cyan-400/20 p-4 text-sm text-cyan-200">{notice}</Panel> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Security score" value={`${dashboard.scores.securityScore}%`} accent="cyan" />
        <MetricCard label="Tenant isolation" value={`${dashboard.scores.tenantIsolationScore}%`} accent="emerald" />
        <MetricCard label="Permission score" value={`${dashboard.scores.permissionScore}%`} accent="blue" />
        <MetricCard label="Secret score" value={`${dashboard.scores.secretManagementScore}%`} accent="orange" />
        <MetricCard label="Active sessions" value={String(dashboard.metrics.activeSessions)} />
        <MetricCard label="Failed logins" value={String(dashboard.metrics.failedLogins)} accent="orange" />
        <MetricCard label="Locked accounts" value={String(dashboard.metrics.lockedAccounts)} accent="purple" />
        <MetricCard label="ACL entries" value={String(dashboard.metrics.aclEntries)} accent="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Secret Health</h2>
            <Button disabled={busy} onClick={() => void runAction('secrets')}>Validate</Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr><th className="py-2">Secret</th><th>Status</th><th>Source</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-slate-300">
                {dashboard.secretHealth.items.map((item) => (
                  <tr key={item.name}>
                    <td className="py-3 pr-4 font-medium text-white">{item.name}</td>
                    <td className="py-3 pr-4"><Badge tone={toneForStatus(item.status)}>{item.status}</Badge></td>
                    <td className="py-3 text-slate-400">{item.source || 'unconfigured'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Encryption & ACL</h2>
            <Button disabled={busy} onClick={() => void runAction('encryption')}>Rotate key</Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricCard label="Encryption" value={dashboard.encryptionHealth.status} accent="emerald" />
            <MetricCard label="Key version" value={String(dashboard.encryptionHealth.version)} accent="blue" />
            <MetricCard label="Restricted docs" value={String(dashboard.aclStatistics.restrictedDocuments)} accent="orange" />
            <MetricCard label="Inherited ACLs" value={String(dashboard.aclStatistics.inheritedEntries)} accent="purple" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Active Sessions</h2>
          <div className="mt-4 space-y-3">
            {dashboard.activeSessions.length ? dashboard.activeSessions.slice(0, 8).map((session) => (
              <div key={session.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{session.email}</p>
                  <Badge tone="info">{session.role}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">{session.ipAddress || 'no ip'} - {session.tenantId}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No active sessions recorded.</p>}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-white">Security Events</h2>
          <div className="mt-4 space-y-3">
            {dashboard.events.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{event.eventType}</p>
                  <Badge tone={event.allowed ? 'success' : 'warning'}>{event.allowed ? 'allowed' : 'denied'}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">{event.actorEmail || 'system'} - {event.reason || event.action}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
