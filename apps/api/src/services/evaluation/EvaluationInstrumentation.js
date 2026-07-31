import { logger } from '../../utils/logger.js';

const INSTRUCTIONS_HEADING = 'Instructions:';
const CONSTRAINTS_HEADING = 'Constraints:';
const RETRIEVED_HEADING = 'Automatically Retrieved Context:';
const NO_CONTEXT_MARKER = 'No retrieved context available.';

/**
 * Reads the instruction list out of a prompt assembled by PromptAssembler.
 * Parsing the assembled prompt keeps the AI Gateway contract untouched: no
 * caller has to pass extra evaluation metadata.
 */
export function extractInstructions(systemPrompt = '') {
  const start = systemPrompt.indexOf(INSTRUCTIONS_HEADING);

  if (start < 0) {
    return [];
  }

  const afterHeading = systemPrompt.slice(start + INSTRUCTIONS_HEADING.length);
  const end = afterHeading.indexOf(CONSTRAINTS_HEADING);
  const block = end >= 0 ? afterHeading.slice(0, end) : afterHeading;

  return block
    .split('\n')
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export function extractRetrievedKnowledge(systemPrompt = '') {
  const start = systemPrompt.indexOf(RETRIEVED_HEADING);

  if (start < 0) {
    return '';
  }

  const block = systemPrompt.slice(start + RETRIEVED_HEADING.length).trim();

  return block === NO_CONTEXT_MARKER ? '' : block;
}

function lastUserMessage(messages = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index].content || '';
    }
  }

  return '';
}

/**
 * Attaches automatic evaluation to the existing AI Gateway.
 *
 * The wrapper returns the gateway response untouched and schedules scoring on
 * the next tick, so evaluation can never add latency to, or fail, a user
 * request. Failures are logged and swallowed.
 */
export class EvaluationInstrumentation {
  constructor({ evaluationService, evaluationRepository, enabled = true }) {
    this.evaluationService = evaluationService;
    this.evaluationRepository = evaluationRepository;
    this.enabled = enabled;
  }

  buildInput({ payload, response }) {
    const systemPrompt = payload.systemPrompt || '';
    const knowledgeText = extractRetrievedKnowledge(systemPrompt);

    return {
      subjectType: 'conversation',
      subjectId: payload.conversationId || null,
      agentCode: response.usage?.agentCode || payload.agentCode,
      conversationId: payload.conversationId || null,
      provider: response.usage?.provider || payload.provider,
      model: response.usage?.model || payload.model,
      source: 'automatic',
      latencyMs: response.usage?.durationMs,
      promptTokens: response.usage?.promptTokens,
      completionTokens: response.usage?.completionTokens,
      totalTokens: response.usage?.totalTokens,
      estimatedCost: response.usage?.estimatedCost,
      instructions: extractInstructions(systemPrompt),
      question: lastUserMessage(payload.messages),
      outputText: response.text || '',
      knowledgeText,
      knowledgeExpected: Boolean(knowledgeText),
      approvalState: 'pending',
    };
  }

  async evaluateResponse({ payload, response }) {
    const input = this.buildInput({ payload, response });

    if (payload.conversationId && this.evaluationRepository) {
      const [documentIds, promptId] = await Promise.all([
        this.evaluationRepository.listConversationDocumentIds(payload.conversationId),
        this.evaluationRepository.getConversationPromptId(payload.conversationId),
      ]);

      input.documentIds = documentIds;
      input.promptId = promptId;

      if (promptId) {
        const prompt = await this.evaluationRepository.getPromptById(promptId);
        input.promptVersion = Number(prompt?.version) || 0;
      }
    }

    return this.evaluationService.recordEvaluation(input);
  }

  instrumentAiGateway(aiGateway) {
    if (!aiGateway || aiGateway.__evaluationInstrumented) {
      return aiGateway;
    }

    const instrumentation = this;
    const original = aiGateway.generate.bind(aiGateway);

    aiGateway.generate = async function generate(payload = {}) {
      const response = await original(payload);

      if (instrumentation.enabled && response?.text !== undefined) {
        setImmediate(() => {
          instrumentation.evaluateResponse({ payload, response }).catch((error) => {
            logger.warn('evaluation_capture_failed', {
              message: error instanceof Error ? error.message : 'unknown error',
              conversationId: payload.conversationId || null,
            });
          });
        });
      }

      return response;
    };

    aiGateway.__evaluationInstrumented = true;

    return aiGateway;
  }
}
