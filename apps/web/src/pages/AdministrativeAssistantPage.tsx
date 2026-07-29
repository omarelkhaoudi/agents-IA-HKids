import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createConversationSession,
  getAssistantBootstrap,
  getConversationSession,
  listConversationSessions,
  searchRetrievalContext,
  sendAssistantMessage,
} from '../api/assistant';
import type {
  AssistantBootstrapResponse,
  AssistantContext,
  AssistantSession,
} from '../types/assistant-runtime';
import type { RetrievalSearchResponse } from '../types/retrieval';
import ContextPanel from '../components/context/ContextPanel';
import RetrievalDebugPanel from '../components/context/RetrievalDebugPanel';
import DocumentReviewWorkspace from '../components/documents/DocumentReviewWorkspace';
import ConversationSidebar from '../components/chat/ConversationSidebar';
import MessageComposer from '../components/chat/MessageComposer';
import MessageList from '../components/chat/MessageList';
import QuickActions from '../components/chat/QuickActions';
import WelcomeHero from '../components/chat/WelcomeHero';
import Panel from '../components/ui/Panel';
import type { DocumentKind, QuickAction } from '../types/assistant';

const defaultActions: QuickAction[] = [
  {
    id: 'quotation',
    label: 'Prepare proposal draft',
    prompt: 'Prepare a structured business proposal draft for H-Kids.',
    summary: 'Organize the draft, scope, and key points for internal review.',
  },
  {
    id: 'invoice',
    label: 'Prepare follow-up summary',
    prompt: 'Create a concise follow-up summary for the current case.',
    summary: 'Summarize next steps, blockers, and coordination points.',
  },
  {
    id: 'purchase-order',
    label: 'Prepare action plan',
    prompt: 'Build a practical action plan using the selected knowledge base.',
    summary: 'Turn the request into an operational plan with checkpoints.',
  },
  {
    id: 'delivery-note',
    label: 'Prepare status note',
    prompt: 'Draft a status note with responsibilities and deadlines.',
    summary: 'Capture responsibilities, delivery points, and timing.',
  },
  {
    id: 'letter',
    label: 'Draft formal letter',
    prompt: 'Draft a formal letter adapted to the selected agent context.',
    summary: 'Produce a formal letter ready for human validation.',
  },
  {
    id: 'email',
    label: 'Draft email',
    prompt: 'Write a professional email aligned with the selected agent mission.',
    summary: 'Prepare a clear email draft for review before sending.',
  },
];

const actionsByAgent: Record<string, QuickAction[]> = {
  'community-manager': [
    {
      id: 'quotation',
      label: 'Plan editorial calendar',
      prompt: 'Prepare a weekly editorial calendar for H-Kids social channels.',
      summary: 'Organize posts, stories, themes, and publication rhythm.',
    },
    {
      id: 'invoice',
      label: 'Draft social post',
      prompt: 'Draft a high-quality publication aligned with the H-Kids brand tone.',
      summary: 'Prepare a publication draft with CTA and audience fit.',
    },
    {
      id: 'purchase-order',
      label: 'Prepare story sequence',
      prompt: 'Prepare a story sequence for an H-Kids campaign or event.',
      summary: 'Sequence frames, hooks, and reminders for stories.',
    },
    {
      id: 'delivery-note',
      label: 'Prepare campaign brief',
      prompt: 'Build a concise campaign brief with messages, goals, and channels.',
      summary: 'Centralize campaign direction before publication.',
    },
    {
      id: 'letter',
      label: 'Draft comment responses',
      prompt: 'Prepare response drafts for comments or community questions.',
      summary: 'Keep replies warm, clear, and on-brand.',
    },
    {
      id: 'email',
      label: 'Draft partner announcement',
      prompt: 'Write an announcement email for partners or families about a campaign.',
      summary: 'Prepare a polished outreach draft linked to communication actions.',
    },
  ],
  'administrative-assistant': [
    {
      id: 'quotation',
      label: 'Create quotation',
      prompt: 'Prepare a quotation for school transportation support and after-school coordination.',
      summary: 'Draft a client-facing quotation with pricing and validity period.',
    },
    {
      id: 'invoice',
      label: 'Create invoice',
      prompt: 'Create an invoice for June administrative support and procurement assistance.',
      summary: 'Generate a billing-ready invoice layout with due date and totals.',
    },
    {
      id: 'purchase-order',
      label: 'Create purchase order',
      prompt: 'Build a purchase order for educational materials and classroom supplies.',
      summary: 'Prepare a supplier-ready purchase order with line items and delivery details.',
    },
    {
      id: 'delivery-note',
      label: 'Create delivery note',
      prompt: 'Create a delivery note for distributed welcome kits and printed materials.',
      summary: 'Track delivered items and acknowledgement details.',
    },
    {
      id: 'letter',
      label: 'Create administrative letter',
      prompt: 'Draft an administrative letter confirming enrollment support and next steps.',
      summary: 'Produce a formal administrative letter with signature block.',
    },
    {
      id: 'email',
      label: 'Create email',
      prompt: 'Write a follow-up email to a parent about registration documents and deadlines.',
      summary: 'Prepare a professional email draft with subject and action items.',
    },
  ],
  'sales-agent': [
    {
      id: 'quotation',
      label: 'Prepare sales proposal',
      prompt: 'Prepare a commercial proposal draft for an H-Kids prospect.',
      summary: 'Structure value proposition, offer, and next steps.',
    },
    {
      id: 'invoice',
      label: 'Prepare lead qualification',
      prompt: 'Summarize and qualify the current lead for the sales pipeline.',
      summary: 'Capture need, urgency, fit, and qualification notes.',
    },
    {
      id: 'purchase-order',
      label: 'Suggest product mix',
      prompt: 'Suggest the most relevant H-Kids products for this prospect.',
      summary: 'Align offer recommendations with customer needs.',
    },
    {
      id: 'delivery-note',
      label: 'Prepare follow-up plan',
      prompt: 'Prepare a prospect follow-up plan with timing and callouts.',
      summary: 'Sequence relances and follow-up touchpoints.',
    },
    {
      id: 'letter',
      label: 'Draft commercial letter',
      prompt: 'Draft a commercial letter tailored to the prospect situation.',
      summary: 'Produce a formal commercial draft for approval.',
    },
    {
      id: 'email',
      label: 'Draft sales email',
      prompt: 'Write a persuasive but controlled commercial email draft.',
      summary: 'Prepare a clean follow-up email before sending.',
    },
  ],
  'hr-agent': [
    {
      id: 'quotation',
      label: 'Prepare job description',
      prompt: 'Prepare a structured job description draft for H-Kids.',
      summary: 'Define mission, responsibilities, and required profile.',
    },
    {
      id: 'invoice',
      label: 'Prepare absence summary',
      prompt: 'Prepare an absence or leave follow-up summary for HR review.',
      summary: 'Centralize dates, context, and pending actions.',
    },
    {
      id: 'purchase-order',
      label: 'Prepare HR follow-up sheet',
      prompt: 'Create a structured HR follow-up sheet for the current case.',
      summary: 'Track decisions, actions, and compliance points.',
    },
    {
      id: 'delivery-note',
      label: 'Prepare explanation request',
      prompt: 'Draft a request for explanation adapted to the HR situation.',
      summary: 'Produce a controlled HR draft for internal review.',
    },
    {
      id: 'letter',
      label: 'Draft HR letter',
      prompt: 'Draft a formal HR letter aligned with internal HR governance.',
      summary: 'Prepare a formal HR communication requiring validation.',
    },
    {
      id: 'email',
      label: 'Draft internal HR email',
      prompt: 'Write an internal HR email draft with a careful and professional tone.',
      summary: 'Prepare a reviewable HR communication draft.',
    },
  ],
};

const agentDepartments: Record<string, string> = {
  'community-manager': 'Communication',
  'administrative-assistant': 'Administration',
  'sales-agent': 'Sales',
  'hr-agent': 'Human Resources',
};

const documentEnabledAgents = new Set(['administrative-assistant', 'sales-agent', 'hr-agent']);

export default function AdministrativeAssistantPage() {
  const [searchParams] = useSearchParams();
  const [selectedActionId, setSelectedActionId] = useState<DocumentKind>('quotation');
  const [selectedAgentCode, setSelectedAgentCode] = useState('administrative-assistant');
  const [bootstrap, setBootstrap] = useState<AssistantBootstrapResponse | null>(null);
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AssistantSession | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [currentContext, setCurrentContext] = useState<AssistantContext | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestPreview, setRequestPreview] = useState<{
    provider: string;
    model: string;
    agentCode: string;
    assembledPrompt: string;
    retrieval: RetrievalSearchResponse;
  } | null>(null);
  const [retrievalDebugResult, setRetrievalDebugResult] = useState<RetrievalSearchResponse | null>(null);
  const requestedAgentCode = searchParams.get('agent') || '';

  const selectedActions = useMemo(
    () => actionsByAgent[selectedAgentCode] || defaultActions,
    [selectedAgentCode]
  );

  const selectedAction = useMemo(
    () => selectedActions.find((action) => action.id === selectedActionId) ?? selectedActions[0],
    [selectedActionId, selectedActions]
  );

  const selectedAgent = useMemo(
    () => bootstrap?.agents.find((agent) => agent.code === selectedAgentCode) || null,
    [bootstrap?.agents, selectedAgentCode]
  );

  const applyAgentDefaults = (agentCode: string, bootstrapResponse: AssistantBootstrapResponse) => {
    const agent = bootstrapResponse.agents.find((item) => item.code === agentCode);
    setSelectedPromptId(agent?.promptIds?.[0] || bootstrapResponse.prompts[0]?.id || '');
    setSelectedDocumentIds(agent?.documentIds?.length ? agent.documentIds : bootstrapResponse.documents.slice(0, 2).map((document) => document.id));
    setSelectedModel(agent?.defaultModel || bootstrapResponse.defaultModel);
    setCurrentContext({
      ...bootstrapResponse.defaultContext,
      department: agentDepartments[agentCode] || bootstrapResponse.defaultContext.department,
    });
  };

  const syncSessionConfiguration = useCallback((session: AssistantSession, fallbackContext: AssistantContext) => {
    setSelectedAgentCode(session.agentCode || 'administrative-assistant');
    setSelectedPromptId(session.selectedPromptId);
    setSelectedDocumentIds(session.selectedDocumentIds);
    setSelectedModel(session.model);
    setCurrentContext(session.currentContext || fallbackContext);
  }, []);

  useEffect(() => {
    const initializeAssistant = async () => {
      setLoading(true);
      setError('');

      try {
        const bootstrapResponse = await getAssistantBootstrap();
        const queryAgentCode = new URLSearchParams(window.location.search).get('agent') || '';
        const defaultAgentCode =
          (queryAgentCode &&
            bootstrapResponse.agents.some((agent) => agent.code === queryAgentCode) &&
            queryAgentCode) ||
          bootstrapResponse.defaultAgentCode ||
          bootstrapResponse.agents[0]?.code ||
          'administrative-assistant';
        const existingSessions = await listConversationSessions(defaultAgentCode);

        setBootstrap(bootstrapResponse);
        setSelectedAgentCode(defaultAgentCode);
        setSessions(existingSessions);
        applyAgentDefaults(defaultAgentCode, bootstrapResponse);

        if (existingSessions.length > 0) {
          setSelectedSession(existingSessions[0]);
          syncSessionConfiguration(existingSessions[0], bootstrapResponse.defaultContext);
        } else {
          const initialActions = actionsByAgent[defaultAgentCode] || defaultActions;
          const agent = bootstrapResponse.agents.find((item) => item.code === defaultAgentCode);
          const newSession = await createConversationSession({
            title: initialActions[0]?.label || 'New conversation',
            agentCode: defaultAgentCode,
            selectedPromptId: agent?.promptIds?.[0] || bootstrapResponse.prompts[0]?.id || '',
            selectedDocumentIds: agent?.documentIds?.length ? agent.documentIds : bootstrapResponse.documents.slice(0, 2).map((document) => document.id),
            currentContext: {
              ...bootstrapResponse.defaultContext,
              department: agentDepartments[defaultAgentCode] || bootstrapResponse.defaultContext.department,
            },
            model: agent?.defaultModel || bootstrapResponse.defaultModel,
            provider: agent?.defaultProvider || bootstrapResponse.defaultProvider,
          });

          setSessions([newSession]);
          setSelectedSession(newSession);
          syncSessionConfiguration(newSession, bootstrapResponse.defaultContext);
        }
      } catch (initializationError) {
        setError(
          initializationError instanceof Error
            ? initializationError.message
            : 'Unable to initialize the assistant.'
        );
      } finally {
        setLoading(false);
      }
    };

    void initializeAssistant();
  }, [syncSessionConfiguration]);

  useEffect(() => {
    if (!bootstrap || !requestedAgentCode || requestedAgentCode === selectedAgentCode) {
      return;
    }

    if (!bootstrap.agents.some((agent) => agent.code === requestedAgentCode)) {
      return;
    }

    void handleAgentChange(requestedAgentCode);
    // handleAgentChange is stable enough for URL-driven agent switches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap, requestedAgentCode]);

  const refreshSessions = async (agentCode = selectedAgentCode) => {
    const refreshedSessions = await listConversationSessions(agentCode);
    setSessions(refreshedSessions);
    return refreshedSessions;
  };

  const handleAgentChange = async (agentCode: string) => {
    if (!bootstrap) {
      return;
    }

    setSelectedAgentCode(agentCode);
    setSelectedActionId('quotation');
    setRequestPreview(null);
    setRetrievalDebugResult(null);
    applyAgentDefaults(agentCode, bootstrap);

    const refreshedSessions = await refreshSessions(agentCode);
    if (refreshedSessions.length > 0) {
      setSelectedSession(refreshedSessions[0]);
      syncSessionConfiguration(refreshedSessions[0], bootstrap.defaultContext);
    } else {
      setSelectedSession(null);
    }
  };

  const handleCreateSession = async () => {
    if (!bootstrap || !currentContext) {
      return;
    }

    const newSession = await createConversationSession({
      title: selectedAction.label,
      agentCode: selectedAgentCode,
      selectedPromptId,
      selectedDocumentIds,
      currentContext,
      model: selectedModel,
      provider: selectedAgent?.defaultProvider || bootstrap.defaultProvider,
    });

    setSessions((currentSessions) => [newSession, ...currentSessions]);
    setSelectedSession(newSession);
    setRequestPreview(null);
  };

  const handleSelectSession = async (sessionId: string) => {
    if (!bootstrap) {
      return;
    }

    const cachedSession = sessions.find((session) => session.id === sessionId);
    if (cachedSession) {
      setSelectedSession(cachedSession);
      syncSessionConfiguration(cachedSession, bootstrap.defaultContext);
      return;
    }

    const session = await getConversationSession(sessionId);
    setSelectedSession(session);
    syncSessionConfiguration(session, bootstrap.defaultContext);
  };

  const handleSendMessage = async (message: string) => {
    if (!bootstrap || !selectedSession || !currentContext || !selectedPromptId) {
      return;
    }

    setIsTyping(true);
    setError('');

    try {
      const response = await sendAssistantMessage({
        sessionId: selectedSession.id,
        provider: selectedAgent?.defaultProvider || bootstrap.defaultProvider,
        model: selectedModel,
        agentCode: selectedAgentCode,
        selectedPromptId,
        selectedDocumentIds,
        currentContext,
        message,
      });

      setSelectedSession(response.session);
      setRequestPreview(response.requestPreview);
      setSessions((currentSessions) => {
        const existingIndex = currentSessions.findIndex((session) => session.id === response.session.id);

        if (existingIndex === -1) {
          return [response.session, ...currentSessions];
        }

        const nextSessions = [...currentSessions];
        nextSessions[existingIndex] = response.session;
        return nextSessions;
      });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send the message.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleToggleDocument = (documentId: string) => {
    setSelectedDocumentIds((currentIds) =>
      currentIds.includes(documentId)
        ? currentIds.filter((currentId) => currentId !== documentId)
        : [...currentIds, documentId]
    );
  };

  const handleRunRetrievalDebug = async (question: string) => {
    const result = await searchRetrievalContext(question);
    setRetrievalDebugResult(result);
  };

  const refreshCurrentSession = async () => {
    if (!selectedSession) {
      return;
    }

    const session = await getConversationSession(selectedSession.id);
    setSelectedSession(session);
    setSessions((currentSessions) =>
      currentSessions.map((currentSession) =>
        currentSession.id === session.id ? session : currentSession
      )
    );
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Conversations
          </p>
          <ConversationSidebar
            sessions={sessions}
            selectedSessionId={selectedSession?.id || null}
            onCreateSession={() => {
              void handleCreateSession();
            }}
            onSelectSession={(sessionId) => {
              void handleSelectSession(sessionId);
            }}
          />
        </div>

        <div className="space-y-5">
          <WelcomeHero
            agentName={selectedAgent?.name || 'H-Kids Agent'}
            agentDescription={
              selectedAgent?.description || 'Governed draft preparation with human validation.'
            }
            selectedAction={selectedAction}
          />

          <Panel className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Agent Selection
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Choose the specialized agent. All outputs remain drafts and require human
                  validation.
                </p>
              </div>
              <select
                value={selectedAgentCode}
                onChange={(event) => {
                  void handleAgentChange(event.target.value);
                }}
                aria-label="Select AI agent"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 lg:max-w-sm"
              >
                {(bootstrap?.agents || []).map((agent) => (
                  <option key={agent.id} value={agent.code}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Quick Actions
              </p>
              <p className="mt-2 text-sm text-slate-400">Switch specialized workflows instantly.</p>
            </div>
            <QuickActions
              actions={selectedActions}
              selectedActionId={selectedActionId}
              onSelect={setSelectedActionId}
            />
          </Panel>

          <Panel className="flex min-h-[540px] flex-col overflow-hidden p-0">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300/90">
                AI Conversation
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                ChatGPT-style workspace with prompt assembly, retrieval, and human validation.
              </p>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-16 w-3/4" />
                  <div className="skeleton h-16 w-full" />
                  <div className="skeleton h-16 w-2/3" />
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : (
                <MessageList messages={selectedSession?.messages || []} typing={isTyping} />
              )}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <MessageComposer
                actionLabel={selectedAction.label}
                actionId={selectedActionId}
                disabled={loading || isTyping || !selectedSession}
                onSend={handleSendMessage}
              />
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Knowledge · Prompt · Context
          </p>
          <ContextPanel
            prompts={bootstrap?.prompts || []}
            documents={bootstrap?.documents || []}
            models={bootstrap?.models || []}
            selectedPromptId={selectedPromptId}
            selectedDocumentIds={selectedDocumentIds}
            selectedModel={selectedModel}
            currentContext={
              currentContext || {
                department: '',
                language: '',
                companyName: '',
                companyAddress: '',
                contactName: '',
              }
            }
            requestPreview={requestPreview}
            onPromptChange={setSelectedPromptId}
            onDocumentToggle={handleToggleDocument}
            onModelChange={setSelectedModel}
            onContextChange={setCurrentContext}
          />
        </div>
      </section>

      <RetrievalDebugPanel
        initialQuestion={selectedAction.prompt}
        result={retrievalDebugResult || requestPreview?.retrieval || null}
        onSearch={handleRunRetrievalDebug}
      />

      {documentEnabledAgents.has(selectedAgentCode) ? (
        <div className="space-y-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Documents · Workflow · Feedback
          </p>
          <DocumentReviewWorkspace
            session={selectedSession}
            selectedActionId={selectedActionId}
            currentContext={currentContext}
            onSessionRefresh={refreshCurrentSession}
          />
        </div>
      ) : (
        <Panel className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Human Validation Reminder
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-white">
            Draft-only communication workspace
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            This agent prepares communication drafts and campaign material, but no publication or
            sending is automated. Final posting, sending, or external engagement stays under human
            control.
          </p>
        </Panel>
      )}
    </div>
  );
}