import { useEffect, useMemo, useState } from 'react';
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
import { quickActions } from '../data/assistant';
import type { DocumentKind } from '../types/assistant';

export default function AdministrativeAssistantPage() {
  const [selectedActionId, setSelectedActionId] = useState<DocumentKind>('quotation');
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
    assembledPrompt: string;
    retrieval: RetrievalSearchResponse;
  } | null>(null);
  const [retrievalDebugResult, setRetrievalDebugResult] = useState<RetrievalSearchResponse | null>(null);

  const selectedAction = useMemo(
    () => quickActions.find((action) => action.id === selectedActionId) ?? quickActions[0],
    [selectedActionId]
  );

  useEffect(() => {
    const initializeAssistant = async () => {
      setLoading(true);
      setError('');

      try {
        const [bootstrapResponse, existingSessions] = await Promise.all([
          getAssistantBootstrap(),
          listConversationSessions(),
        ]);

        setBootstrap(bootstrapResponse);
        setSessions(existingSessions);
        setSelectedPromptId(bootstrapResponse.prompts[0]?.id || '');
        setSelectedDocumentIds(bootstrapResponse.documents.slice(0, 2).map((document) => document.id));
        setSelectedModel(bootstrapResponse.defaultModel);
        setCurrentContext(bootstrapResponse.defaultContext);

        if (existingSessions.length > 0) {
          setSelectedSession(existingSessions[0]);
          syncSessionConfiguration(existingSessions[0], bootstrapResponse.defaultContext);
        } else {
          const newSession = await createConversationSession({
            title: quickActions[0]?.label || 'New conversation',
            selectedPromptId: bootstrapResponse.prompts[0]?.id || '',
            selectedDocumentIds: bootstrapResponse.documents.slice(0, 2).map((document) => document.id),
            currentContext: bootstrapResponse.defaultContext,
            model: bootstrapResponse.defaultModel,
            provider: bootstrapResponse.defaultProvider,
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
  }, []);

  const syncSessionConfiguration = (session: AssistantSession, fallbackContext: AssistantContext) => {
    setSelectedPromptId(session.selectedPromptId);
    setSelectedDocumentIds(session.selectedDocumentIds);
    setSelectedModel(session.model);
    setCurrentContext(session.currentContext || fallbackContext);
  };

  const handleCreateSession = async () => {
    if (!bootstrap || !currentContext) {
      return;
    }

    const newSession = await createConversationSession({
      title: selectedAction.label,
      selectedPromptId,
      selectedDocumentIds,
      currentContext,
      model: selectedModel,
      provider: bootstrap.defaultProvider,
    });

    setSessions((currentSessions) => [newSession, ...currentSessions]);
    setSelectedSession(newSession);
    setRequestPreview(null);
  };

  const handleSelectSession = async (sessionId: string) => {
    if (!bootstrap) {
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
        provider: bootstrap.defaultProvider,
        model: selectedModel,
        selectedPromptId,
        selectedDocumentIds,
        currentContext,
        message,
      });

      setSelectedSession(response.session);
      setRequestPreview(response.requestPreview);

      const refreshedSessions = await listConversationSessions();
      setSessions(refreshedSessions);
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

    const refreshedSessions = await listConversationSessions();
    setSessions(refreshedSessions);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
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

        <div className="space-y-6">
          <WelcomeHero selectedAction={selectedAction} />

          <Panel className="p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Quick Actions
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Switch document workflows instantly to update the chat and preview experience.
                </p>
              </div>
            </div>
            <QuickActions
              actions={quickActions}
              selectedActionId={selectedActionId}
              onSelect={setSelectedActionId}
            />
          </Panel>

          <Panel className="flex min-h-[540px] flex-col p-6">
            <div className="border-b border-white/10 pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Modern AI Chat
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Live orchestration flow with provider abstraction, conversation sessions, prompt assembly, and knowledge context injection.
              </p>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto py-6">
              {loading ? (
                <div className="text-sm text-slate-400">Loading assistant workspace...</div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : (
                <MessageList messages={selectedSession?.messages || []} typing={isTyping} />
              )}
            </div>

            <div className="border-t border-white/10 pt-5">
              <MessageComposer
                actionLabel={selectedAction.label}
                actionId={selectedActionId}
                disabled={loading || isTyping || !selectedSession}
                onSend={handleSendMessage}
              />
            </div>
          </Panel>
        </div>

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
      </section>

      <RetrievalDebugPanel
        initialQuestion={selectedAction.prompt}
        result={retrievalDebugResult || requestPreview?.retrieval || null}
        onSearch={handleRunRetrievalDebug}
      />

      <DocumentReviewWorkspace
        session={selectedSession}
        selectedActionId={selectedActionId}
        currentContext={currentContext}
        onSessionRefresh={refreshCurrentSession}
      />
    </div>
  );
}
