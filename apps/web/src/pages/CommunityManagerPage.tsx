import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  approveCmPost,
  createCmCampaign,
  createCmLibraryItem,
  createCmPost,
  duplicateCmPost,
  exportCmPost,
  generateCmContent,
  getCommunityManagerBootstrap,
  rejectCmPost,
  searchCommunityManager,
  submitCmPostReview,
  updateCmGuidelines,
  updateCmPost,
} from '../api/communityManager';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MetricCard from '../components/ui/MetricCard';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';

const sections = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'calendar', label: 'Editorial Calendar' },
  { id: 'library', label: 'Content Library' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'guidelines', label: 'Brand Guidelines' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'prompts', label: 'Prompt Versions' },
  { id: 'generated', label: 'Generated Content' },
  { id: 'approvals', label: 'Approval Queue' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'history', label: 'History' },
];

const colorByLabel: Record<string, string> = {
  violet: 'border-violet-400/40 bg-violet-400/10',
  cyan: 'border-cyan-400/40 bg-cyan-400/10',
  orange: 'border-orange-400/40 bg-orange-400/10',
  emerald: 'border-emerald-400/40 bg-emerald-400/10',
};

export default function CommunityManagerPage() {
  const [section, setSection] = useState('dashboard');
  const [calendarView, setCalendarView] = useState<'daily' | 'weekly' | 'monthly' | 'campaign'>(
    'weekly'
  );
  const [bootstrap, setBootstrap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [instruction, setInstruction] = useState(
    'Prepare an Instagram educational post for parents about H-Kids daily accompaniment.'
  );
  const [generateForm, setGenerateForm] = useState({
    platform: 'instagram',
    tone: 'parents',
    audience: 'Parents',
    theme: 'Accompagnement',
    contentType: 'educational',
    objective: 'Inform and reassure parents',
  });
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCommunityManagerBootstrap();
      setBootstrap(data);
      if (!selectedPostId && data.posts?.[0]) {
        setSelectedPostId(data.posts[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load workspace.');
    } finally {
      setLoading(false);
    }
  }, [selectedPostId]);

  useEffect(() => {
    void reload();
    // Initial workspace bootstrap only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posts = useMemo(() => bootstrap?.posts || [], [bootstrap?.posts]);
  const campaigns = bootstrap?.campaigns || [];
  const library = bootstrap?.library || [];
  const stats = bootstrap?.stats || {};
  const guidelines = bootstrap?.guidelines;
  const selectedPost = useMemo(
    () => posts.find((post: any) => post.id === selectedPostId) || posts[0] || null,
    [posts, selectedPostId]
  );

  const filteredPosts = useMemo(() => {
    return posts.filter((post: any) => {
      const matchesPlatform = !filterPlatform || post.platform === filterPlatform;
      const matchesStatus = !filterStatus || post.approvalStatus === filterStatus;
      return matchesPlatform && matchesStatus;
    });
  }, [posts, filterPlatform, filterStatus]);

  const pendingPosts = posts.filter((post: any) => post.approvalStatus === 'pending_review');

  async function handleGenerate() {
    setBusy(true);
    setError('');
    try {
      const result = await generateCmContent({
        instruction,
        ...generateForm,
      });
      setSelectedPostId(result.post.id);
      setSection('generated');
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
    const result = await searchCommunityManager(searchQuery.trim());
    setSearchResults(result.items || []);
  }

  async function handleCreateCampaign() {
    setBusy(true);
    try {
      await createCmCampaign({
        name: `Campagne H-Kids ${new Date().toLocaleDateString('fr-FR')}`,
        objective: 'Renforcer la proximité avec les familles',
        targetAudience: 'Parents',
        platforms: ['instagram', 'facebook'],
        status: 'active',
      });
      await reload();
      setSection('campaigns');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateManualPost() {
    setBusy(true);
    try {
      const post = await createCmPost({
        title: 'Nouvelle publication planifiée',
        platform: 'instagram',
        audience: 'Parents',
        theme: 'Communauté',
        objective: 'Engagement',
        body: '',
        scheduledFor: new Date().toISOString(),
        colorLabel: 'violet',
      });
      setSelectedPostId(post.id);
      setSection('calendar');
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function saveGuidelines(next: any) {
    setBusy(true);
    try {
      await updateCmGuidelines(next);
      await reload();
    } finally {
      setBusy(false);
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
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">
              Community Manager AI
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Content preparation workspace
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Prepare posts, stories, campaigns and calendars. Never publish automatically — every
              output stays a draft until human approval.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="purple">Human validation required</Badge>
              <Badge tone="neutral">No social API</Badge>
              <Badge tone="success">Claude default</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleGenerate()} disabled={busy}>
              {busy ? 'Generating...' : 'Generate draft'}
            </Button>
            <Button variant="secondary" onClick={() => void handleCreateManualPost()} disabled={busy}>
              Plan post
            </Button>
            <Link
              to="/assistant?agent=community-manager"
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
            placeholder="Search campaigns, posts, library..."
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
                  if (item.type === 'post') {
                    setSelectedPostId(item.id);
                    setSection('generated');
                  } else if (item.type === 'campaign') {
                    setSection('campaigns');
                  } else {
                    setSection('library');
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
                ? 'bg-violet-400 text-slate-950'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Generated posts" value={String(stats.generatedPosts || 0)} accent="purple" />
            <MetricCard label="Approved" value={String(stats.approvedPosts || 0)} accent="emerald" />
            <MetricCard label="Pending approval" value={String(stats.pendingApproval || 0)} accent="orange" />
            <MetricCard label="Campaigns" value={String(stats.campaigns || 0)} accent="cyan" />
            <MetricCard label="Library items" value={String(stats.libraryItems || 0)} accent="blue" />
            <MetricCard label="Prompt versions" value={String(bootstrap?.prompts?.length || 0)} accent="purple" />
            <MetricCard label="Knowledge docs" value={String(bootstrap?.knowledgeDocuments?.length || 0)} accent="cyan" />
            <MetricCard label="Most active platform" value={String(stats.mostActivePlatform || 'instagram')} accent="orange" />
          </div>
        </div>
      ) : null}

      {section === 'conversation' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">Conversation studio</h2>
          <p className="mt-2 text-sm text-slate-400">
            Generate from a simple instruction. Brand guidelines and knowledge retrieval are injected
            automatically. Outputs enter draft state only.
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
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['platform', bootstrap?.platforms || []],
                ['tone', bootstrap?.tones || []],
                ['contentType', bootstrap?.contentTypes || []],
              ].map(([key, options]) => (
                <label key={String(key)} className="block text-sm text-slate-300">
                  {String(key)}
                  <select
                    value={(generateForm as any)[key]}
                    onChange={(event) =>
                      setGenerateForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white"
                  >
                    {(options as string[]).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="block text-sm text-slate-300">
                Audience
                <input
                  value={generateForm.audience}
                  onChange={(event) =>
                    setGenerateForm((current) => ({ ...current, audience: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white"
                />
              </label>
            </div>
          </div>
          <div className="mt-5">
            <Button onClick={() => void handleGenerate()} disabled={busy || !instruction.trim()}>
              {busy ? 'Preparing draft...' : 'Generate with Claude + RAG'}
            </Button>
          </div>
        </Panel>
      ) : null}

      {section === 'calendar' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['daily', 'weekly', 'monthly', 'campaign'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setCalendarView(view)}
                className={[
                  'rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.14em]',
                  calendarView === view ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-400',
                ].join(' ')}
              >
                {view}
              </button>
            ))}
            <select
              value={filterPlatform}
              onChange={(event) => setFilterPlatform(event.target.value)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"
              aria-label="Filter platform"
            >
              <option value="">All platforms</option>
              {(bootstrap?.platforms || []).map((platform: string) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"
              aria-label="Filter status"
            >
              <option value="">All statuses</option>
              {['draft', 'pending_review', 'approved', 'rejected', 'exported'].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((post: any) => (
              <article
                key={post.id}
                className={[
                  'hover-lift rounded-[1.25rem] border p-4',
                  colorByLabel[post.colorLabel] || colorByLabel.violet,
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{post.title}</h3>
                  <Badge tone="info">{post.platform}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {post.audience} · {post.theme || 'No theme'} · {post.approvalStatus}
                </p>
                <p className="mt-3 line-clamp-3 text-sm text-slate-300">{post.body || 'Empty draft'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedPostId(post.id);
                      setSection('generated');
                    }}
                  >
                    Open
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void duplicateCmPost(post.id).then(reload)}>
                    Duplicate
                  </Button>
                </div>
              </article>
            ))}
            {!filteredPosts.length ? (
              <Panel className="p-6 text-sm text-slate-400">No planned publications yet.</Panel>
            ) : null}
          </div>
        </div>
      ) : null}

      {section === 'library' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void createCmLibraryItem({
                  category: 'template',
                  title: 'Reusable tip template',
                  content: 'Hook + conseil + CTA doux',
                  tags: ['template'],
                }).then(reload)
              }
            >
              Add template
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void createCmLibraryItem({
                  category: 'hashtag',
                  title: 'Local pack',
                  content: '#Casablanca #Maroc #HKids',
                  tags: ['local'],
                }).then(reload)
              }
            >
              Add hashtag pack
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {library.map((item: any) => (
              <Panel key={item.id} className="p-4">
                <Badge tone="purple">{item.category}</Badge>
                <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.content}</p>
              </Panel>
            ))}
          </div>
        </div>
      ) : null}

      {section === 'campaigns' ? (
        <div className="space-y-4">
          <Button onClick={() => void handleCreateCampaign()} disabled={busy}>
            Create campaign
          </Button>
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.map((campaign: any) => (
              <Panel key={campaign.id} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-white">{campaign.name}</h3>
                  <Badge tone="info">{campaign.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-400">{campaign.objective}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                  Audience: {campaign.targetAudience || '—'} · Platforms:{' '}
                  {(campaign.platforms || []).join(', ') || '—'}
                </p>
              </Panel>
            ))}
            {!campaigns.length ? (
              <Panel className="p-6 text-sm text-slate-400">No campaigns yet.</Panel>
            ) : null}
          </div>
        </div>
      ) : null}

      {section === 'guidelines' && guidelines ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">Brand guidelines</h2>
          <p className="mt-2 text-sm text-slate-400">
            Injected automatically into Community Manager generation prompts.
          </p>
          <label className="mt-5 block text-sm text-slate-300">
            Brand tone
            <textarea
              defaultValue={guidelines.brandTone}
              rows={4}
              id="cm-brand-tone"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white"
            />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <GuidelineList title="Preferred expressions" items={guidelines.preferredExpressions || []} />
            <GuidelineList title="Forbidden expressions" items={guidelines.forbiddenExpressions || []} />
            <GuidelineList title="Vocabulary" items={guidelines.vocabulary || []} />
            <GuidelineList title="Principles" items={guidelines.communicationPrinciples || []} />
          </div>
          <div className="mt-5">
            <Button
              onClick={() => {
                const tone = (document.getElementById('cm-brand-tone') as HTMLTextAreaElement)?.value;
                void saveGuidelines({ ...guidelines, brandTone: tone });
              }}
              disabled={busy}
            >
              Save guidelines
            </Button>
          </div>
        </Panel>
      ) : null}

      {section === 'knowledge' ? (
        <Panel className="p-6">
          <h2 className="font-display text-xl font-semibold text-white">Knowledge Base</h2>
          <p className="mt-2 text-sm text-slate-400">
            Uses the existing RAG engine. Manage documents in Knowledge Base, then generate here.
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
                No marketing-tagged documents yet. Add them in Knowledge Base with tags like
                marketing/brand/community.
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
          <h2 className="font-display text-xl font-semibold text-white">Prompt versions</h2>
          <p className="mt-2 text-sm text-slate-400">
            Reuses the existing Prompt Builder. Community Manager templates are seeded and linked.
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

      {section === 'generated' || section === 'approvals' || section === 'history' ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel className="p-4">
            <h2 className="font-display text-lg font-semibold text-white">
              {section === 'approvals' ? 'Approval queue' : section === 'history' ? 'History' : 'Generated content'}
            </h2>
            <div className="mt-4 space-y-3">
              {(section === 'approvals' ? pendingPosts : posts).map((post: any) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setSelectedPostId(post.id)}
                  className={[
                    'w-full rounded-2xl border px-4 py-3 text-left transition',
                    selectedPost?.id === post.id
                      ? 'border-violet-400/40 bg-violet-400/10'
                      : 'border-white/10 bg-white/4 hover:bg-white/8',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium text-white">{post.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {post.platform} · {post.approvalStatus}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          {selectedPost ? (
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {selectedPost.headline || selectedPost.title}
                  </h3>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                    {selectedPost.platform} · {selectedPost.tone} · {selectedPost.approvalStatus}
                  </p>
                </div>
                <Badge tone={selectedPost.approvalStatus === 'approved' ? 'success' : 'purple'}>
                  {selectedPost.approvalStatus}
                </Badge>
              </div>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {selectedPost.body}
              </p>
              {selectedPost.cta ? (
                <p className="mt-4 text-sm text-cyan-200">CTA: {selectedPost.cta}</p>
              ) : null}
              <p className="mt-3 text-sm text-slate-400">
                {(selectedPost.hashtags || []).join(' ')}
              </p>
              {selectedPost.timingSuggestion ? (
                <p className="mt-2 text-xs text-slate-500">Timing: {selectedPost.timingSuggestion}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedPost.approvalStatus === 'draft' ? (
                  <Button
                    size="sm"
                    onClick={() => void submitCmPostReview(selectedPost.id).then(reload)}
                  >
                    Submit for review
                  </Button>
                ) : null}
                {selectedPost.approvalStatus === 'pending_review' ? (
                  <>
                    <Button size="sm" onClick={() => void approveCmPost(selectedPost.id).then(reload)}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void rejectCmPost(selectedPost.id).then(reload)}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {['approved', 'exported'].includes(selectedPost.approvalStatus) ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void exportCmPost(selectedPost.id, 'markdown')}
                    >
                      Export Markdown
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void exportCmPost(selectedPost.id, 'html')}
                    >
                      Export HTML
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void navigator.clipboard.writeText(
                          [selectedPost.headline, selectedPost.body, selectedPost.cta, (selectedPost.hashtags || []).join(' ')].join('\n\n')
                        )
                      }
                    >
                      Copy
                    </Button>
                  </>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void updateCmPost(selectedPost.id, {
                      scheduledFor: new Date(Date.now() + 86400000).toISOString(),
                      status: 'scheduled',
                    }).then(reload)
                  }
                >
                  Move +1 day
                </Button>
              </div>
            </Panel>
          ) : (
            <Panel className="p-6 text-sm text-slate-400">Select a draft to review.</Panel>
          )}
        </div>
      ) : null}

      {section === 'analytics' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Generated contents" value={String(stats.generatedPosts || 0)} accent="purple" />
          <MetricCard label="Approval rate" value={`${stats.approvalRate || 0}%`} accent="emerald" />
          <MetricCard label="Most used platform" value={String(stats.mostActivePlatform || '—')} accent="cyan" />
          <MetricCard label="Templates / library" value={String(stats.libraryItems || 0)} accent="orange" />
          {(stats.platforms || []).map((item: any) => (
            <MetricCard
              key={item.platform}
              label={`Platform ${item.platform}`}
              value={String(item.total)}
              accent="blue"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GuidelineList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
