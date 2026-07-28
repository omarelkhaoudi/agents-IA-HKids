import { useEffect, useMemo, useState } from 'react';
import {
  approveConversationDocument,
  downloadConversationDocument,
  generateConversationDocument,
  getDocumentWorkflow,
  submitDocumentFeedback,
  transitionDocumentWorkflow,
  updateConversationDocument,
} from '../../api/assistant';
import { variablesByAction } from '../../data/assistant';
import type { DocumentKind } from '../../types/assistant';
import type { AssistantContext, AssistantSession } from '../../types/assistant-runtime';
import type { WorkflowData } from '../../types/workflow';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

const documentTypeOptions = [
  { id: 'quotation', label: 'Quotation' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'purchase-order', label: 'Purchase Order' },
  { id: 'delivery-note', label: 'Delivery Note' },
  { id: 'administrative-letter', label: 'Administrative Letter' },
  { id: 'commercial-letter', label: 'Commercial Letter' },
  { id: 'internal-memo', label: 'Internal Memo' },
  { id: 'meeting-report', label: 'Meeting Report' },
  { id: 'certificate', label: 'Certificate' },
  { id: 'email', label: 'Email' },
];

const documentTypeByAction: Record<DocumentKind, string> = {
  quotation: 'quotation',
  invoice: 'invoice',
  'purchase-order': 'purchase-order',
  'delivery-note': 'delivery-note',
  letter: 'administrative-letter',
  email: 'email',
};

interface DocumentReviewWorkspaceProps {
  session: AssistantSession | null;
  selectedActionId: DocumentKind;
  currentContext: AssistantContext | null;
  onSessionRefresh: () => Promise<void>;
}

export default function DocumentReviewWorkspace({
  session,
  selectedActionId,
  currentContext,
  onSessionRefresh,
}: DocumentReviewWorkspaceProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState(documentTypeByAction[selectedActionId]);
  const [editableVariables, setEditableVariables] = useState<Record<string, string>>({});
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackType, setFeedbackType] = useState('Accept');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [workflowComment, setWorkflowComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');

  const generatedDocuments = useMemo(() => session?.generatedDocuments || [], [session]);
  const latestAssistantMessage = [...(session?.messages || [])]
    .reverse()
    .find((message) => message.role === 'assistant');

  const selectedDocument = useMemo(
    () =>
      generatedDocuments.find((document) => document.id === selectedDocumentId) ||
      generatedDocuments[0] ||
      null,
    [generatedDocuments, selectedDocumentId]
  );

  useEffect(() => {
    setSelectedDocumentType(documentTypeByAction[selectedActionId]);
  }, [selectedActionId]);

  useEffect(() => {
    if (selectedDocument) {
      setSelectedDocumentId(selectedDocument.id);
      setEditableVariables(selectedDocument.resolvedVariables);
      setCorrectedText(selectedDocument.renderedPreview.replace(/<[^>]+>/g, ' ').trim());
      return;
    }

    setEditableVariables({});
    setCorrectedText('');
  }, [selectedDocument]);

  useEffect(() => {
    async function loadWorkflow() {
      if (!session || !selectedDocument) {
        setWorkflow(null);
        return;
      }

      try {
        const nextWorkflow = await getDocumentWorkflow({
          sessionId: session.id,
          documentId: selectedDocument.id,
        });
        setWorkflow(nextWorkflow);
      } catch {
        setWorkflow(null);
      }
    }

    void loadWorkflow();
  }, [selectedDocument, session]);

  const createDefaultVariables = () => {
    const sourceVariables = variablesByAction[selectedActionId] || [];
    const mappedVariables = Object.fromEntries(sourceVariables.map((item) => [item.key, item.value]));

    return {
      reference: mappedVariables.invoiceNumber || mappedVariables.deliveryRef || `REF-${Date.now()}`,
      date: new Date().toLocaleDateString('en-GB'),
      signature: mappedVariables.signatory || currentContext?.contactName || 'H-Kids',
      subtotal: mappedVariables.budget || 'MAD 0',
      tax: 'MAD 0',
      total: mappedVariables.budget || 'MAD 0',
      items: sourceVariables.map((item) => item.value).join(', '),
    };
  };

  const buildProfiles = () => {
    const sourceVariables = variablesByAction[selectedActionId] || [];
    const mappedVariables = Object.fromEntries(sourceVariables.map((item) => [item.key, item.value]));

    return {
      companyProfile: {
        companyName: currentContext?.companyName || 'H-Kids',
        companyAddress: currentContext?.companyAddress || '',
        contactName: currentContext?.contactName || 'H-Kids Team',
      },
      customerProfile: {
        clientName:
          mappedVariables.clientName ||
          mappedVariables.recipient ||
          mappedVariables.supplier ||
          mappedVariables.billingContact ||
          'Client',
        address: currentContext?.companyAddress || '',
      },
    };
  };

  const handleGenerate = async () => {
    if (!session || !latestAssistantMessage || !currentContext) {
      return;
    }

    setBusy(true);
    setWorkspaceError('');

    try {
      await generateConversationDocument({
        sessionId: session.id,
        assistantResponse: latestAssistantMessage.content,
        documentType: selectedDocumentType,
        variables: createDefaultVariables(),
        ...buildProfiles(),
        language: currentContext.language,
      });

      await onSessionRefresh();
    } catch (error) {
      setWorkspaceError(
        error instanceof Error ? error.message : 'Unable to generate the document draft.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleApplyOverrides = async () => {
    if (!session || !selectedDocument || !currentContext) {
      return;
    }

    setBusy(true);
    setWorkspaceError('');

    try {
      await updateConversationDocument({
        sessionId: session.id,
        documentId: selectedDocument.id,
        variables: editableVariables,
        ...buildProfiles(),
        language: currentContext.language,
      });

      await onSessionRefresh();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : 'Unable to update the document.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!session || !selectedDocument) {
      return;
    }

    setBusy(true);

    try {
      await approveConversationDocument({
        sessionId: session.id,
        documentId: selectedDocument.id,
        actor: 'Administrator',
        comment: workflowComment || 'Approved by reviewer.',
      });
      setWorkflowComment('');
      setWorkflow(
        await getDocumentWorkflow({
          sessionId: session.id,
          documentId: selectedDocument.id,
        })
      );
      await onSessionRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleTransition = async (nextState: string) => {
    if (!session || !selectedDocument) {
      return;
    }

    setBusy(true);
    setWorkspaceError('');

    try {
      const nextWorkflow = await transitionDocumentWorkflow({
        sessionId: session.id,
        documentId: selectedDocument.id,
        nextState,
        actor: 'Administrator',
        comment: workflowComment,
      });
      setWorkflow(nextWorkflow);
      setWorkflowComment('');
    } catch (error) {
      setWorkspaceError(
        error instanceof Error ? error.message : 'Unable to update the workflow state.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (format: string) => {
    if (!session || !selectedDocument) {
      return;
    }

    const blob = await downloadConversationDocument({
      sessionId: session.id,
      documentId: selectedDocument.id,
      format,
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDocument.structuredDocument.reference}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitFeedback = async () => {
    if (!session || !selectedDocument) {
      return;
    }

    await submitDocumentFeedback({
      conversationId: session.id,
      messageId: latestAssistantMessage?.id,
      documentId: selectedDocument.id,
      agentCode: session.agentCode,
      originalText: selectedDocument.renderedPreview.replace(/<[^>]+>/g, ' ').trim(),
      correctedText,
      feedbackType,
      rating: feedbackRating,
      comment: feedbackComment,
    });

    setFeedbackComment('');
  };

  return (
    <Panel className="p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Document Review Workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Review, validate, approve, and export
          </h2>
        </div>

        <div className="flex w-full gap-3 xl:max-w-2xl">
          <select
            value={selectedDocumentType}
            onChange={(event) => setSelectedDocumentType(event.target.value)}
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            {documentTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <Button onClick={() => void handleGenerate()} disabled={busy || !latestAssistantMessage}>
            {busy ? 'Working...' : 'Generate Draft'}
          </Button>
        </div>
      </div>

      {workspaceError ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
          {workspaceError}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              Generated Document History
            </h3>
            <div className="mt-4 space-y-3">
              {generatedDocuments.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setSelectedDocumentId(document.id)}
                  className={[
                    'w-full rounded-2xl border p-4 text-left transition',
                    selectedDocument?.id === document.id
                      ? 'border-cyan-400/35 bg-cyan-400/10'
                      : 'border-white/10 bg-slate-900/70 hover:bg-white/5',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold text-white">
                    {document.structuredDocument.title}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {document.structuredDocument.reference}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              Editable Variables
            </h3>
            <div className="mt-4 space-y-3">
              {Object.entries(editableVariables).map(([key, value]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                    {key}
                  </span>
                  <input
                    value={value}
                    onChange={(event) =>
                      setEditableVariables((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="secondary" fullWidth onClick={() => void handleApplyOverrides()}>
                Apply Overrides
              </Button>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Validation Warnings</h3>
                <p className="mt-1 text-sm text-slate-400">Approval is required before export.</p>
              </div>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                {workflow?.currentState || 'Draft'}
              </span>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {(selectedDocument?.validationWarnings || ['No validation warnings.']).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-200">
                Approval Comment
              </span>
              <input
                value={workflowComment}
                onChange={(event) => setWorkflowComment(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => void handleTransition('Pending Review')}
                disabled={!selectedDocument || busy || workflow?.currentState !== 'Draft'}
              >
                Submit for Review
              </Button>
              <Button
                variant="secondary"
                onClick={() => void handleTransition('Needs Changes')}
                disabled={!selectedDocument || busy || workflow?.currentState !== 'Pending Review'}
              >
                Needs Changes
              </Button>
              <Button
                variant="secondary"
                onClick={() => void handleTransition('Rejected')}
                disabled={
                  !selectedDocument ||
                  busy ||
                  !['Draft', 'Pending Review'].includes(workflow?.currentState || '')
                }
              >
                Reject
              </Button>
              <Button
                onClick={() => void handleApprove()}
                disabled={!selectedDocument || selectedDocument.approved || busy}
              >
                {selectedDocument?.approved ? 'Approved' : 'Approve Document'}
              </Button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Available Exports</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Download is enabled only after approval.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {(selectedDocument?.availableExportFormats || []).map((format) => (
                  <Button
                    key={format}
                    variant="secondary"
                    onClick={() => void handleDownload(format)}
                    disabled={
                      !selectedDocument?.approved ||
                      !['Approved', 'Exported'].includes(workflow?.currentState || '')
                    }
                  >
                    Download {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="text-lg font-semibold text-white">Workflow Timeline</h3>
            <div className="mt-4 space-y-3">
              {(workflow?.history || []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-white">
                    {item.previous_state ? `${item.previous_state} -> ${item.new_state}` : item.new_state}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {item.actor} · {new Date(item.created_at).toLocaleString()}
                  </p>
                  {item.comment ? (
                    <p className="mt-2 text-sm text-slate-300">{item.comment}</p>
                  ) : null}
                </div>
              ))}
              {!workflow?.history.length ? (
                <p className="text-sm text-slate-400">No workflow activity yet.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="text-lg font-semibold text-white">Approval History</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>
                Assigned reviewer:{' '}
                <span className="font-medium text-white">
                  {workflow?.assignments[0]?.reviewer || 'Administrator'}
                </span>
              </p>
              <p>
                Approval mode:{' '}
                <span className="font-medium text-white">{workflow?.approverMode || 'single'}</span>
              </p>
              <p>
                Required approvals:{' '}
                <span className="font-medium text-white">{workflow?.requiredApprovals || 1}</span>
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="text-lg font-semibold text-white">Comments</h3>
            <div className="mt-4 space-y-3">
              {(workflow?.comments || []).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-white">{item.actor}</p>
                  <p className="mt-2 text-sm text-slate-300">{item.comment}</p>
                </div>
              ))}
              {!workflow?.comments.length ? (
                <p className="text-sm text-slate-400">No approval comments recorded yet.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <h3 className="text-lg font-semibold text-white">Live Preview</h3>
            <div
              className="mt-4 min-h-[720px] overflow-hidden rounded-3xl border border-white/10 bg-white"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(selectedDocument?.renderedPreview || ''),
              }}
            />
          </section>

          {selectedDocument?.approved ? (
            <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <h3 className="text-lg font-semibold text-white">
                Was this document satisfactory?
              </h3>
              <div className="mt-4 flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFeedbackRating(rating)}
                    className={[
                      'rounded-full px-3 py-2 text-sm transition',
                      feedbackRating === rating
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-900 text-slate-300',
                    ].join(' ')}
                  >
                    {rating}★
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">
                    Feedback Type
                  </span>
                  <select
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                  >
                    <option>Accept</option>
                    <option>Minor Edit</option>
                    <option>Major Edit</option>
                    <option>Rejected</option>
                    <option>Manual Rewrite</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Comment</span>
                  <input
                    value={feedbackComment}
                    onChange={(event) => setFeedbackComment(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Inline Corrections
                </span>
                <textarea
                  value={correctedText}
                  onChange={(event) => setCorrectedText(event.target.value)}
                  rows={8}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                />
              </label>

              <div className="mt-4">
                <Button onClick={() => void handleSubmitFeedback()}>Submit Feedback</Button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
