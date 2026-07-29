import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approveHrDocument,
  approveHrJob,
  createHrAbsence,
  createHrCandidate,
  createHrEmployee,
  decideHrLeave,
  exportHrDocument,
  generateHrDocument,
  generateHrJobDescription,
  getHrAgentBootstrap,
  recommendHrLeave,
  rejectHrDocument,
  rejectHrJob,
  searchHrAgent,
  submitHrDocumentReview,
  submitHrJobReview,
  updateHrCandidate,
} from '../api/hrAgent';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';

const sections = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'employees', label: 'Employees' },
  { id: 'recruitment', label: 'Recruitment' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'jobs', label: 'Job Descriptions' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'leave', label: 'Leave Management' },
  { id: 'absences', label: 'Absence Tracking' },
  { id: 'performance', label: 'Performance Reviews' },
  { id: 'training', label: 'Training' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'offboarding', label: 'Offboarding' },
  { id: 'documents', label: 'Documents' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'prompts', label: 'Prompt Templates' },
  { id: 'approvals', label: 'Approval Queue' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

const contractTypes = [
  'employment_contract',
  'internship_agreement',
  'freelance_contract',
  'probation_confirmation',
  'contract_amendment',
  'employment_certificate',
  'salary_certificate',
];

export default function HrAgentPage() {
  const [section, setSection] = useState('dashboard');
  const [bootstrap, setBootstrap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [instruction, setInstruction] = useState(
    'Prepare an onboarding checklist for a new pedagogical coordinator at H-Kids.'
  );
  const [documentType, setDocumentType] = useState('onboarding_plan');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getHrAgentBootstrap();
      setBootstrap(data);
      if (!selectedDocumentId && data.documents?.[0]) {
        setSelectedDocumentId(data.documents[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load HR workspace.');
    } finally {
      setLoading(false);
    }
  }, [selectedDocumentId]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = bootstrap?.stats || {};
  const analytics = bootstrap?.analytics || {};
  const employees = useMemo(() => bootstrap?.employees || [], [bootstrap?.employees]);
  const candidates = bootstrap?.candidates || [];
  const jobs = bootstrap?.jobDescriptions || [];
  const leaveRequests = bootstrap?.leaveRequests || [];
  const absences = bootstrap?.absences || [];
  const documents = useMemo(() => bootstrap?.documents || [], [bootstrap?.documents]);
  const selectedDocument = useMemo(
    () => documents.find((item: any) => item.id === selectedDocumentId) || documents[0] || null,
    [documents, selectedDocumentId]
  );

  const filteredEmployees = useMemo(() => {
    if (!employeeFilter.trim()) return employees;
    const q = employeeFilter.toLowerCase();
    return employees.filter(
      (employee: any) =>
        employee.fullName?.toLowerCase().includes(q) ||
        employee.department?.toLowerCase().includes(q) ||
        employee.position?.toLowerCase().includes(q)
    );
  }, [employees, employeeFilter]);

  const pendingDocuments = documents.filter((item: any) => item.approvalStatus === 'pending_review');
  const pendingJobs = jobs.filter((item: any) => item.approvalStatus === 'pending_review');
  const pendingLeave = leaveRequests.filter((item: any) => item.status === 'pending');

  async function handleGenerate(type = documentType) {
    setBusy(true);
    setError('');
    try {
      const result = await generateHrDocument({
        instruction,
        documentType: type,
        title: `${type.replaceAll('_', ' ')} draft`,
      });
      setSelectedDocumentId(result.document.id);
      setSection('documents');
      await reload();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Generation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const result = await searchHrAgent(searchQuery.trim());
    setSearchResults(result.items || []);
  }

  if (loading && !bootstrap) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Panel className="border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        {bootstrap?.governance?.banner ||
          'HR Agent prepares drafts only. Managers approve. Never hire, fire, sanction, modify salaries, sign contracts, or send emails automatically.'}
      </Panel>

      <Panel className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              HR Agent AI
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">
              People operations workspace
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Prepare HR drafts with RAG and Prompt Builder. Every sensitive action stays in Draft →
              Review → Approve → Export.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="success">Manager approval required</Badge>
              <Badge tone="neutral">No auto-hire / fire</Badge>
              <Badge tone="info">Claude + RAG</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleGenerate()} disabled={busy}>
              {busy ? 'Generating...' : 'Generate draft'}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void generateHrJobDescription({
                  title: 'Coordinateur pédagogique',
                  department: 'Pédagogie',
                  location: 'Casablanca',
                }).then(reload)
              }
              disabled={busy}
            >
              Generate job description
            </Button>
            <Link
              to="/assistant?agent=hr-agent"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200"
            >
              Open chat agent
            </Link>
          </div>
        </div>
      </Panel>

      {error ? (
        <Panel className="border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</Panel>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="flex-1">
          <span className="sr-only">Global search</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search employees, candidates, documents, leave..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          />
        </label>
        <Button variant="secondary" onClick={() => void handleSearch()}>
          Search
        </Button>
      </div>

      {searchResults.length ? (
        <Panel className="p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Search results</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {searchResults.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                onClick={() => {
                  if (item.type === 'document') {
                    setSelectedDocumentId(item.id);
                    setSection('documents');
                  } else if (item.type === 'candidate') setSection('candidates');
                  else if (item.type === 'leave') setSection('leave');
                  else if (item.type === 'job_description') setSection('jobs');
                  else setSection('employees');
                }}
              >
                {item.type}: {item.title}
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={[
              'rounded-full px-4 py-2 text-sm transition',
              section === item.id
                ? 'bg-emerald-400 text-slate-950'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'dashboard' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Employees" value={String(stats.employees || 0)} accent="emerald" />
          <MetricCard label="Recruitments" value={String(stats.recruitments || 0)} accent="cyan" />
          <MetricCard label="Candidates" value={String(stats.candidates || 0)} accent="blue" />
          <MetricCard label="Pending approvals" value={String(stats.pendingApprovals || 0)} accent="orange" />
          <MetricCard label="Leave requests" value={String(stats.leaveRequests || 0)} accent="purple" />
          <MetricCard label="Absence rate" value={`${stats.absenceRate || 0}%`} accent="orange" />
          <MetricCard label="Generated docs" value={String(stats.generatedDocuments || 0)} accent="cyan" />
          <MetricCard label="Most requested" value={String(stats.mostRequestedDocument || '—')} accent="emerald" />
        </div>
      ) : null}

      {section === 'conversation' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">Conversation studio</h2>
          <p className="mt-2 text-sm text-slate-400">
            Generate HR drafts with knowledge retrieval. Outputs stay editable and unpublished.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block text-sm text-slate-300">
              Instruction
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={6}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Document type
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white"
              >
                {(bootstrap?.documentTypes || []).map((type: string) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5">
            <Button onClick={() => void handleGenerate()} disabled={busy || !instruction.trim()}>
              Generate with Claude + RAG
            </Button>
          </div>
        </Panel>
      ) : null}

      {section === 'employees' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              placeholder="Filter employees..."
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
            <Button
              onClick={() =>
                void createHrEmployee({
                  fullName: `Collaborateur ${employees.length + 1}`,
                  email: `employee${employees.length + 1}@hkids.ma`,
                  department: 'Administration',
                  position: 'Collaborateur',
                  status: 'active',
                  tags: ['demo'],
                }).then(reload)
              }
              disabled={busy}
            >
              Add employee
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredEmployees.map((employee: any) => (
              <Panel key={employee.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{employee.fullName}</h3>
                  <Badge tone="success">{employee.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {employee.position} · {employee.department}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {employee.email || '—'} · Manager: {employee.managerName || '—'}
                </p>
                <p className="mt-3 line-clamp-3 text-sm text-slate-300">{employee.notes || 'No notes'}</p>
              </Panel>
            ))}
            {!filteredEmployees.length ? (
              <Panel className="p-6 text-sm text-slate-400">No employees match this filter.</Panel>
            ) : null}
          </div>
        </div>
      ) : null}

      {section === 'recruitment' || section === 'candidates' ? (
        <div className="space-y-4">
          <Button
            onClick={() =>
              void createHrCandidate({
                fullName: `Candidat ${candidates.length + 1}`,
                positionApplied: 'Animateur',
                stage: 'applied',
                source: 'Careers page',
                notes: 'Créé depuis le HR Workspace — aucun contact automatique.',
              }).then(reload)
            }
            disabled={busy}
          >
            Add candidate
          </Button>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {candidates.map((candidate: any) => (
              <Panel key={candidate.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{candidate.fullName}</h3>
                  <Badge tone="info">{candidate.stage}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">{candidate.positionApplied}</p>
                <p className="mt-2 text-xs text-slate-500">Source: {candidate.source || '—'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void updateHrCandidate(candidate.id, {
                        stage: 'shortlist',
                        shortlisted: true,
                      }).then(reload)
                    }
                  >
                    Shortlist
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void handleGenerate('interview_summary').then(() => setSection('documents'))
                    }
                  >
                    Interview draft
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'jobs' ? (
        <div className="space-y-4">
          <Button
            onClick={() =>
              void generateHrJobDescription({
                title: 'Assistant administratif',
                department: 'Administration',
                location: 'Casablanca',
              }).then(reload)
            }
            disabled={busy}
          >
            Generate job description
          </Button>
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((job: any) => (
              <Panel key={job.id} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-white">{job.title}</h3>
                  <Badge tone={job.approvalStatus === 'approved' ? 'success' : 'warning'}>
                    {job.approvalStatus}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {job.department} · {job.location}
                </p>
                <p className="mt-3 line-clamp-4 text-sm text-slate-300">{job.body || job.mission}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.approvalStatus === 'draft' ? (
                    <Button size="sm" onClick={() => void submitHrJobReview(job.id).then(reload)}>
                      Submit review
                    </Button>
                  ) : null}
                  {job.approvalStatus === 'pending_review' ? (
                    <>
                      <Button size="sm" onClick={() => void approveHrJob(job.id).then(reload)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void rejectHrJob(job.id).then(reload)}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'contracts' ||
      section === 'performance' ||
      section === 'training' ||
      section === 'onboarding' ||
      section === 'offboarding' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">
            {section.replaceAll('_', ' ')}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Generate specialized HR drafts. Everything remains editable until manager approval.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(section === 'contracts'
              ? contractTypes
              : section === 'performance'
                ? ['performance_review']
                : section === 'training'
                  ? ['training_plan']
                  : section === 'onboarding'
                    ? ['onboarding_plan']
                    : ['offboarding_plan']
            ).map((type) => (
              <Button
                key={type}
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setDocumentType(type);
                  void handleGenerate(type);
                }}
              >
                Generate {type.replaceAll('_', ' ')}
              </Button>
            ))}
          </div>
        </Panel>
      ) : null}

      {section === 'leave' ? (
        <div className="space-y-4">
          <Button
            onClick={() =>
              void recommendHrLeave({
                employeeName: employees[0]?.fullName || 'Collaborateur',
                employeeId: employees[0]?.id,
                leaveType: 'annual',
                days: 3,
                reason: 'Congé annuel demandé — recommandation IA uniquement.',
              }).then(reload)
            }
            disabled={busy}
          >
            Recommend leave (AI)
          </Button>
          <div className="grid gap-4 md:grid-cols-2">
            {leaveRequests.map((leave: any) => (
              <Panel key={leave.id} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-white">{leave.employeeName || 'Employee'}</h3>
                  <Badge tone={leave.status === 'approved' ? 'success' : 'warning'}>{leave.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {leave.leaveType} · {leave.days} day(s)
                </p>
                <p className="mt-3 text-sm text-slate-300">{leave.aiRecommendation || leave.reason}</p>
                {leave.status === 'pending' ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void decideHrLeave(leave.id, 'approved').then(reload)}
                    >
                      Manager approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void decideHrLeave(leave.id, 'rejected').then(reload)}
                    >
                      Manager reject
                    </Button>
                  </div>
                ) : null}
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'absences' ? (
        <div className="space-y-4">
          <Button
            onClick={() =>
              void createHrAbsence({
                employeeName: employees[0]?.fullName || 'Collaborateur',
                employeeId: employees[0]?.id,
                reason: 'Absence enregistrée pour suivi',
                durationDays: 1,
                alertFlag: absences.length > 2,
              }).then(reload)
            }
            disabled={busy}
          >
            Record absence
          </Button>
          <div className="grid gap-4 md:grid-cols-2">
            {absences.map((absence: any) => (
              <Panel key={absence.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-white">{absence.employeeName}</h3>
                  {absence.alertFlag ? <Badge tone="warning">Alert</Badge> : <Badge tone="neutral">{absence.status}</Badge>}
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {absence.durationDays} day(s) · {absence.reason}
                </p>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'documents' || section === 'approvals' || section === 'history' ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel className="p-4">
            <h2 className="font-display text-lg font-semibold text-white">
              {section === 'approvals' ? 'Approval queue' : section === 'history' ? 'History' : 'Documents'}
            </h2>
            <div className="mt-4 space-y-3">
              {(section === 'approvals'
                ? [
                    ...pendingDocuments,
                    ...pendingJobs.map((job: any) => ({ ...job, documentType: 'job_description' })),
                    ...pendingLeave.map((leave: any) => ({
                      id: leave.id,
                      title: `Leave · ${leave.employeeName}`,
                      documentType: 'leave',
                      approvalStatus: leave.status,
                      body: leave.aiRecommendation,
                      __leave: true,
                    })),
                  ]
                : documents
              ).map((item: any) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.__leave) {
                      setSection('leave');
                      return;
                    }
                    setSelectedDocumentId(item.id);
                  }}
                  className={[
                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                    selectedDocument?.id === item.id
                      ? 'border-emerald-400/40 bg-emerald-400/10'
                      : 'border-white/10 bg-white/4 hover:bg-white/8',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.documentType} · {item.approvalStatus || item.status}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          {selectedDocument && section !== 'leave' ? (
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {selectedDocument.title}
                  </h3>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                    {selectedDocument.documentType} · v{selectedDocument.version} ·{' '}
                    {selectedDocument.approvalStatus}
                  </p>
                </div>
                <Badge tone={selectedDocument.approvalStatus === 'approved' ? 'success' : 'warning'}>
                  {selectedDocument.approvalStatus}
                </Badge>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {selectedDocument.body}
              </p>
              {selectedDocument.metadata?.reasoning ? (
                <p className="mt-4 text-sm text-cyan-200">Reasoning: {selectedDocument.metadata.reasoning}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedDocument.approvalStatus === 'draft' ? (
                  <Button
                    size="sm"
                    onClick={() => void submitHrDocumentReview(selectedDocument.id).then(reload)}
                  >
                    Submit for review
                  </Button>
                ) : null}
                {selectedDocument.approvalStatus === 'pending_review' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => void approveHrDocument(selectedDocument.id).then(reload)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void rejectHrDocument(selectedDocument.id).then(reload)}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {['approved', 'exported'].includes(selectedDocument.approvalStatus) ? (
                  <>
                    {(['markdown', 'html', 'csv'] as const).map((format) => (
                      <Button
                        key={format}
                        size="sm"
                        variant="secondary"
                        onClick={() => void exportHrDocument(selectedDocument.id, format)}
                      >
                        Export {format.toUpperCase()}
                      </Button>
                    ))}
                  </>
                ) : null}
                <Link to="/feedback-dashboard" className="text-sm text-cyan-300 hover:underline self-center">
                  Open Feedback →
                </Link>
              </div>
            </Panel>
          ) : (
            <Panel className="p-6 text-sm text-slate-400">Select a document to review.</Panel>
          )}
        </div>
      ) : null}

      {section === 'knowledge' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">Knowledge Base</h2>
          <p className="mt-2 text-sm text-slate-400">
            Reuses existing RAG. Tag documents with hr/policy/recruitment for better retrieval.
          </p>
          <div className="mt-5 space-y-3">
            {(bootstrap?.knowledgeDocuments || []).map((document: any) => (
              <div key={document.id} className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <p className="font-medium text-white">{document.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {document.category} · {(document.tags || []).join(', ')}
                </p>
              </div>
            ))}
            {!bootstrap?.knowledgeDocuments?.length ? (
              <p className="text-sm text-slate-400">No HR-tagged documents yet.</p>
            ) : null}
          </div>
          <Link to="/knowledge-base" className="mt-5 inline-flex text-sm text-cyan-300 hover:underline">
            Open Knowledge Base →
          </Link>
        </Panel>
      ) : null}

      {section === 'prompts' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">Prompt templates</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(bootstrap?.prompts || []).map((prompt: any) => (
              <div key={prompt.id} className="rounded-2xl border border-white/10 bg-white/4 p-4">
                <p className="font-medium text-white">{prompt.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  v{prompt.version} · {prompt.status}
                </p>
                <p className="mt-2 text-sm text-slate-400">{prompt.description}</p>
              </div>
            ))}
          </div>
          <Link to="/prompt-builder" className="mt-5 inline-flex text-sm text-cyan-300 hover:underline">
            Open Prompt Builder →
          </Link>
        </Panel>
      ) : null}

      {section === 'analytics' ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Knowledge usage" value={String(analytics.knowledgeUsage || 0)} accent="cyan" />
            <MetricCard label="Prompt usage" value={String(analytics.promptUsage || 0)} accent="purple" />
            <MetricCard label="Absence alerts" value={String(analytics.absenceAlerts || 0)} accent="orange" />
            <MetricCard label="Employees" value={String(analytics.employees || 0)} accent="emerald" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="p-5">
              <h3 className="font-semibold text-white">Recruitment funnel</h3>
              <div className="mt-4 space-y-2">
                {(analytics.recruitmentFunnel || []).map((item: any) => (
                  <div key={item.stage} className="flex justify-between text-sm text-slate-300">
                    <span>{item.stage}</span>
                    <span>{item.total}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="p-5">
              <h3 className="font-semibold text-white">Document types</h3>
              <div className="mt-4 space-y-2">
                {(analytics.documentTypes || []).slice(0, 8).map((item: any) => (
                  <div key={item.type} className="flex justify-between text-sm text-slate-300">
                    <span>{item.type}</span>
                    <span>{item.total}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {section === 'settings' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">HR settings</h2>
          <p className="mt-2 text-sm text-slate-400">
            Governance flags are enforced server-side. AI may recommend only; managers decide.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-slate-300">
            {Object.entries(bootstrap?.governance || {})
              .filter(([key]) => key !== 'banner')
              .map(([key, value]) => (
                <li key={key}>
                  {key}: {String(value)}
                </li>
              ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
