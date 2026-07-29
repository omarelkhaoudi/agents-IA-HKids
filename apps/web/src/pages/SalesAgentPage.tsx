import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approveSalesDocument,
  approveSalesQuotation,
  createSalesCompany,
  createSalesDeal,
  createSalesProduct,
  createSalesProspect,
  exportSalesDocument,
  exportSalesQuotation,
  generateSalesDocument,
  generateSalesQuotation,
  getSalesAgentBootstrap,
  moveSalesDeal,
  rejectSalesDocument,
  rejectSalesQuotation,
  searchSalesAgent,
  submitSalesDocumentReview,
  submitSalesQuotationReview,
} from '../api/salesAgent';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';

const sections = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'prospects', label: 'Prospects' },
  { id: 'companies', label: 'Companies' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'deals', label: 'Deals' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'catalog', label: 'Product Catalog' },
  { id: 'documents', label: 'Commercial Documents' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'prompts', label: 'Prompt Templates' },
  { id: 'approvals', label: 'Approval Queue' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'history', label: 'History' },
];

const stageLabel: Record<string, string> = {
  new_lead: 'New Lead',
  qualified: 'Qualified',
  meeting: 'Meeting',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export default function SalesAgentPage() {
  const [section, setSection] = useState('dashboard');
  const [bootstrap, setBootstrap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [instruction, setInstruction] = useState(
    'Prepare a commercial proposal for a partner school interested in H-Kids accompaniment.'
  );
  const [documentType, setDocumentType] = useState('proposal');
  const [customerName, setCustomerName] = useState('École Partenaire');
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [dragDealId, setDragDealId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSalesAgentBootstrap();
      setBootstrap(data);
      if (!selectedQuotationId && data.quotations?.[0]) {
        setSelectedQuotationId(data.quotations[0].id);
      }
      if (!selectedDocumentId && data.documents?.[0]) {
        setSelectedDocumentId(data.documents[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load sales workspace.');
    } finally {
      setLoading(false);
    }
  }, [selectedDocumentId, selectedQuotationId]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = bootstrap?.stats || {};
  const analytics = bootstrap?.analytics || {};
  const prospects = useMemo(() => bootstrap?.prospects || [], [bootstrap?.prospects]);
  const companies = bootstrap?.companies || [];
  const products = bootstrap?.products || [];
  const deals = bootstrap?.deals || [];
  const quotations = useMemo(() => bootstrap?.quotations || [], [bootstrap?.quotations]);
  const documents = useMemo(() => bootstrap?.documents || [], [bootstrap?.documents]);
  const stages = bootstrap?.pipelineStages || Object.keys(stageLabel);

  const selectedQuotation = useMemo(
    () => quotations.find((item: any) => item.id === selectedQuotationId) || quotations[0] || null,
    [quotations, selectedQuotationId]
  );
  const selectedDocument = useMemo(
    () => documents.find((item: any) => item.id === selectedDocumentId) || documents[0] || null,
    [documents, selectedDocumentId]
  );

  const pendingQuotations = quotations.filter((item: any) => item.approvalStatus === 'pending_review');
  const pendingDocuments = documents.filter((item: any) => item.approvalStatus === 'pending_review');

  async function handleGenerateDocument() {
    setBusy(true);
    setError('');
    try {
      const result = await generateSalesDocument({
        instruction,
        documentType,
        customerName,
        title: `${documentType.replaceAll('_', ' ')} — ${customerName}`,
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

  async function handleGenerateQuotation() {
    setBusy(true);
    setError('');
    try {
      const result = await generateSalesQuotation({
        customerName,
        title: `Devis ${customerName}`,
        instruction: `Prepare quotation narrative for ${customerName}. ${instruction}`,
        lines: products[0]
          ? [
              {
                productId: products[0].id,
                name: products[0].name,
                quantity: 1,
                unitPrice: products[0].unitPrice,
              },
            ]
          : undefined,
      });
      setSelectedQuotationId(result.quotation.id);
      setSection('quotations');
      await reload();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Quotation generation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const result = await searchSalesAgent(searchQuery.trim());
    setSearchResults(result.items || []);
  }

  async function handleDropStage(stage: string) {
    if (!dragDealId) return;
    setBusy(true);
    try {
      await moveSalesDeal(dragDealId, stage);
      await reload();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Unable to move deal.');
    } finally {
      setBusy(false);
      setDragDealId(null);
    }
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
      <Panel className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-300">
              Sales Agent AI
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Commercial preparation workspace
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Prepare CRM notes, quotations, proposals and follow-ups. Never send emails, never
              contact clients, never approve discounts — everything requires human validation.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="warning">Human approval required</Badge>
              <Badge tone="neutral">No auto-send</Badge>
              <Badge tone="success">Claude + RAG</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleGenerateDocument()} disabled={busy}>
              {busy ? 'Generating...' : 'Generate draft'}
            </Button>
            <Button variant="secondary" onClick={() => void handleGenerateQuotation()} disabled={busy}>
              Generate quotation
            </Button>
            <Link
              to="/assistant?agent=sales-agent"
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
            placeholder="Search prospects, companies, deals, products, quotations..."
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
                  if (item.type === 'quotation') {
                    setSelectedQuotationId(item.id);
                    setSection('quotations');
                  } else if (item.type === 'deal') {
                    setSection('pipeline');
                  } else if (item.type === 'product') {
                    setSection('catalog');
                  } else if (item.type === 'company') {
                    setSection('companies');
                  } else {
                    setSection('prospects');
                  }
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
                ? 'bg-orange-400 text-slate-950'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'dashboard' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active prospects" value={String(stats.activeProspects || 0)} accent="orange" />
          <MetricCard label="Open deals" value={String(stats.openDeals || 0)} accent="cyan" />
          <MetricCard label="Pipeline value" value={`${Math.round(stats.pipelineValue || 0)} MAD`} accent="blue" />
          <MetricCard label="Won" value={String(stats.wonOpportunities || 0)} accent="emerald" />
          <MetricCard label="Lost" value={String(stats.lostOpportunities || 0)} accent="orange" />
          <MetricCard label="Avg deal size" value={`${Math.round(stats.averageDealSize || 0)} MAD`} accent="purple" />
          <MetricCard label="Conversion" value={`${stats.conversionRate || 0}%`} accent="emerald" />
          <MetricCard label="Pending approvals" value={String(stats.pendingApprovals || 0)} accent="orange" />
        </div>
      ) : null}

      {section === 'conversation' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">Conversation studio</h2>
          <p className="mt-2 text-sm text-slate-400">
            Generate commercial drafts with RAG. Outputs stay in draft until approval. Nothing is
            sent to customers.
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
            <div className="grid gap-3">
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
              <label className="block text-sm text-slate-300">
                Customer
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white"
                />
              </label>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void handleGenerateDocument()} disabled={busy || !instruction.trim()}>
              Generate commercial draft
            </Button>
            <Button variant="secondary" onClick={() => void handleGenerateQuotation()} disabled={busy}>
              Generate quotation draft
            </Button>
          </div>
        </Panel>
      ) : null}

      {section === 'prospects' ? (
        <div className="space-y-4">
          <Button
            onClick={() =>
              void createSalesProspect({
                fullName: `Prospect ${prospects.length + 1}`,
                contactName: 'Contact commercial',
                email: `prospect${prospects.length + 1}@example.ma`,
                phone: '+212 6 00 00 00 00',
                status: 'new_lead',
                source: 'Inbound',
                tags: ['demo'],
                notes: 'Créé depuis le Sales Workspace — aucun contact automatique.',
              }).then(reload)
            }
            disabled={busy}
          >
            Add prospect
          </Button>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {prospects.map((prospect: any) => (
              <Panel key={prospect.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{prospect.fullName}</h3>
                  <Badge tone="warning">{prospect.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {prospect.email || '—'} · {prospect.phone || '—'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Source: {prospect.source || '—'} · Assigned: {prospect.assignedUser || '—'}
                </p>
                <p className="mt-3 line-clamp-3 text-sm text-slate-300">{prospect.notes || 'No notes'}</p>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'companies' ? (
        <div className="space-y-4">
          <Button
            onClick={() =>
              void createSalesCompany({
                name: `Société ${companies.length + 1}`,
                industry: 'Éducation',
                email: `company${companies.length + 1}@example.ma`,
                tags: ['crm'],
                notes: 'Compte CRM léger — validation humaine avant tout contact.',
              }).then(reload)
            }
            disabled={busy}
          >
            Add company
          </Button>
          <div className="grid gap-4 md:grid-cols-2">
            {companies.map((company: any) => (
              <Panel key={company.id} className="p-5">
                <h3 className="font-display text-lg font-semibold text-white">{company.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{company.industry || '—'}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {company.email || '—'} · {company.phone || '—'}
                </p>
                <p className="mt-3 text-sm text-slate-300">{company.notes || 'No notes'}</p>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'pipeline' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                void createSalesDeal({
                  title: `Opportunité ${deals.length + 1}`,
                  stage: 'new_lead',
                  expectedRevenue: 5000,
                  probability: 10,
                  notes: 'Deal créé dans le pipeline — export/envoi soumis à validation.',
                }).then(reload)
              }
              disabled={busy}
            >
              Add deal
            </Button>
            <p className="self-center text-xs text-slate-500">Drag cards between stages</p>
          </div>
          <div className="grid gap-3 xl:grid-cols-7 lg:grid-cols-4 md:grid-cols-2">
            {stages.map((stage: string) => (
              <div
                key={stage}
                className="min-h-[220px] rounded-[1.25rem] border border-white/10 bg-white/4 p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void handleDropStage(stage)}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {stageLabel[stage] || stage}
                </p>
                <div className="mt-3 space-y-2">
                  {deals
                    .filter((deal: any) => deal.stage === stage)
                    .map((deal: any) => (
                      <article
                        key={deal.id}
                        draggable
                        onDragStart={() => setDragDealId(deal.id)}
                        className="cursor-grab rounded-2xl border border-orange-400/20 bg-slate-950/60 p-3 active:cursor-grabbing"
                      >
                        <p className="text-sm font-medium text-white">{deal.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {deal.expectedRevenue} {deal.currency} · {deal.probability}%
                        </p>
                      </article>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'deals' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {deals.map((deal: any) => (
            <Panel key={deal.id} className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-white">{deal.title}</h3>
                <Badge tone="info">{stageLabel[deal.stage] || deal.stage}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Revenue: {deal.expectedRevenue} {deal.currency} · Probability: {deal.probability}%
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Close: {deal.expectedCloseDate || '—'} · Assigned: {deal.assignedUser || '—'}
              </p>
              <p className="mt-3 text-sm text-slate-300">{deal.notes || 'No notes'}</p>
            </Panel>
          ))}
          {!deals.length ? <Panel className="p-6 text-sm text-slate-400">No deals yet.</Panel> : null}
        </div>
      ) : null}

      {section === 'quotations' || section === 'approvals' || section === 'history' ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel className="p-4">
            <h2 className="font-display text-lg font-semibold text-white">
              {section === 'approvals'
                ? 'Approval queue'
                : section === 'history'
                  ? 'History'
                  : 'Quotations'}
            </h2>
            <div className="mt-4 space-y-3">
              {(section === 'approvals'
                ? [...pendingQuotations, ...pendingDocuments.map((doc: any) => ({ ...doc, __kind: 'document' }))]
                : section === 'history'
                  ? quotations
                  : quotations
              ).map((item: any) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.__kind === 'document' || item.documentType) {
                      setSelectedDocumentId(item.id);
                      setSection(section === 'approvals' ? 'approvals' : 'documents');
                    } else {
                      setSelectedQuotationId(item.id);
                    }
                  }}
                  className={[
                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                    (selectedQuotation?.id === item.id || selectedDocument?.id === item.id)
                      ? 'border-orange-400/40 bg-orange-400/10'
                      : 'border-white/10 bg-white/4 hover:bg-white/8',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.customerName || item.documentType || 'document'} · {item.approvalStatus}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          {selectedQuotation && section !== 'documents' ? (
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {selectedQuotation.title}
                  </h3>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                    {selectedQuotation.customerName} · {selectedQuotation.approvalStatus}
                  </p>
                </div>
                <Badge tone={selectedQuotation.approvalStatus === 'approved' ? 'success' : 'warning'}>
                  {selectedQuotation.approvalStatus}
                </Badge>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {selectedQuotation.body}
              </p>
              <div className="mt-4 space-y-1 text-sm text-slate-400">
                {(selectedQuotation.lines || []).map((line: any, index: number) => (
                  <p key={`${line.name}-${index}`}>
                    {line.name}: {line.quantity} × {line.unitPrice} = {line.lineTotal}{' '}
                    {selectedQuotation.currency}
                  </p>
                ))}
              </div>
              <p className="mt-4 text-sm text-cyan-200">
                Total: {selectedQuotation.total} {selectedQuotation.currency} · Discount suggestion:{' '}
                {selectedQuotation.discountSuggestion}% (not auto-approved)
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedQuotation.approvalStatus === 'draft' ? (
                  <Button
                    size="sm"
                    onClick={() => void submitSalesQuotationReview(selectedQuotation.id).then(reload)}
                  >
                    Submit for review
                  </Button>
                ) : null}
                {selectedQuotation.approvalStatus === 'pending_review' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => void approveSalesQuotation(selectedQuotation.id).then(reload)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void rejectSalesQuotation(selectedQuotation.id).then(reload)}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {['approved', 'exported'].includes(selectedQuotation.approvalStatus) ? (
                  <>
                    {(['markdown', 'html', 'pdf', 'docx'] as const).map((format) => (
                      <Button
                        key={format}
                        size="sm"
                        variant="secondary"
                        onClick={() => void exportSalesQuotation(selectedQuotation.id, format)}
                      >
                        Export {format.toUpperCase()}
                      </Button>
                    ))}
                  </>
                ) : null}
              </div>
            </Panel>
          ) : (
            <Panel className="p-6 text-sm text-slate-400">Select a quotation to review.</Panel>
          )}
        </div>
      ) : null}

      {section === 'catalog' ? (
        <div className="space-y-4">
          <Button
            onClick={() =>
              void createSalesProduct({
                name: `Offre ${products.length + 1}`,
                category: 'service',
                description: 'Service commercial H-Kids — tarif indicatif.',
                features: ['Support', 'Suivi'],
                unitPrice: 1000,
                availability: 'available',
                internalNotes: 'Prix soumis à validation commerciale.',
              }).then(reload)
            }
            disabled={busy}
          >
            Add product / service
          </Button>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product: any) => (
              <Panel key={product.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{product.name}</h3>
                  <Badge tone="info">{product.availability}</Badge>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {product.category}
                </p>
                <p className="mt-3 text-sm text-slate-300">{product.description}</p>
                <p className="mt-3 text-sm text-cyan-200">
                  {product.unitPrice} {product.currency}
                </p>
                <p className="mt-2 text-xs text-slate-500">{product.internalNotes}</p>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'documents' ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel className="p-4">
            <h2 className="font-display text-lg font-semibold text-white">Commercial documents</h2>
            <div className="mt-4 space-y-3">
              {documents.map((document: any) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setSelectedDocumentId(document.id)}
                  className={[
                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                    selectedDocument?.id === document.id
                      ? 'border-orange-400/40 bg-orange-400/10'
                      : 'border-white/10 bg-white/4 hover:bg-white/8',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium text-white">{document.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {document.documentType} · {document.approvalStatus}
                  </p>
                </button>
              ))}
            </div>
          </Panel>
          {selectedDocument ? (
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {selectedDocument.title}
                  </h3>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                    {selectedDocument.documentType} · {selectedDocument.approvalStatus}
                  </p>
                </div>
                <Badge tone={selectedDocument.approvalStatus === 'approved' ? 'success' : 'warning'}>
                  {selectedDocument.approvalStatus}
                </Badge>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {selectedDocument.body}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedDocument.approvalStatus === 'draft' ? (
                  <Button
                    size="sm"
                    onClick={() => void submitSalesDocumentReview(selectedDocument.id).then(reload)}
                  >
                    Submit for review
                  </Button>
                ) : null}
                {selectedDocument.approvalStatus === 'pending_review' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => void approveSalesDocument(selectedDocument.id).then(reload)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void rejectSalesDocument(selectedDocument.id).then(reload)}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {['approved', 'exported'].includes(selectedDocument.approvalStatus) ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void exportSalesDocument(selectedDocument.id, 'markdown')}
                    >
                      Export Markdown
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void exportSalesDocument(selectedDocument.id, 'html')}
                    >
                      Export HTML
                    </Button>
                  </>
                ) : null}
              </div>
            </Panel>
          ) : (
            <Panel className="p-6 text-sm text-slate-400">Select a document.</Panel>
          )}
        </div>
      ) : null}

      {section === 'knowledge' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">Knowledge Base</h2>
          <p className="mt-2 text-sm text-slate-400">
            Reuses the existing RAG engine. Tag documents with sales/commercial/pricing for better
            retrieval.
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
              <p className="text-sm text-slate-400">
                No sales-tagged documents yet. Add PDF/DOCX/XLSX/MD/TXT in Knowledge Base.
              </p>
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
          <p className="mt-2 text-sm text-slate-400">
            Reuses Prompt Builder. Seeded templates cover qualification, quotation, proposal,
            negotiation, follow-up, cross-sell, upsell and objections.
          </p>
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
            <MetricCard
              label="Proposal acceptance"
              value={`${analytics.proposalAcceptance || 0}%`}
              accent="emerald"
            />
            <MetricCard
              label="Quotation approval"
              value={`${analytics.quotationApprovalRate || 0}%`}
              accent="cyan"
            />
            <MetricCard label="Knowledge usage" value={String(analytics.knowledgeUsage || 0)} accent="blue" />
            <MetricCard label="Prompt usage" value={String(analytics.promptUsage || 0)} accent="purple" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel className="p-5">
              <h3 className="font-semibold text-white">Sales funnel</h3>
              <div className="mt-4 space-y-2">
                {(analytics.salesFunnel || []).map((item: any) => (
                  <div key={item.stage} className="flex items-center justify-between text-sm text-slate-300">
                    <span>{stageLabel[item.stage] || item.stage}</span>
                    <span>
                      {item.total} · {Math.round(item.value || 0)} MAD
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel className="p-5">
              <h3 className="font-semibold text-white">Most requested products</h3>
              <div className="mt-4 space-y-2">
                {(analytics.mostRequestedProducts || []).map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between text-sm text-slate-300">
                    <span>{item.name}</span>
                    <span>{item.quantity}</span>
                  </div>
                ))}
                {!analytics.mostRequestedProducts?.length ? (
                  <p className="text-sm text-slate-500">Generate quotations to populate demand.</p>
                ) : null}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
