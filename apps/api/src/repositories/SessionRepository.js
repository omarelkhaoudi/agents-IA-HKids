function formatMessageTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapGeneratedDocument(document) {
  return {
    id: document.id,
    agentCode: document.agent_code,
    approved: document.approved,
    version: document.version,
    status: document.status,
    createdAt: document.created_at.toISOString(),
    createdBy: document.created_by,
    approvedAt: document.approved_at ? document.approved_at.toISOString() : null,
    approvedBy: document.approved_by,
    structuredDocument: document.structured_document,
    resolvedVariables: document.resolved_variables,
    renderedPreview: document.rendered_preview,
    validationWarnings: document.validation_warnings,
    availableExportFormats: document.available_export_formats,
  };
}

export class SessionRepository {
  constructor({
    conversationRepository,
    messageRepository,
    generatedDocumentRepository,
    knowledgeRepository,
    promptRepository,
  }) {
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.generatedDocumentRepository = generatedDocumentRepository;
    this.knowledgeRepository = knowledgeRepository;
    this.promptRepository = promptRepository;
  }

  buildSession(
    conversation,
    messages,
    generatedDocuments,
    selectedDocumentIds,
    selectedPromptId
  ) {
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.created_at.toISOString(),
      updatedAt: conversation.updated_at.toISOString(),
      agentCode: conversation.agent_code,
      selectedPromptId,
      selectedDocumentIds,
      currentContext: conversation.current_context,
      model: conversation.model,
      provider: conversation.provider,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: formatMessageTimestamp(message.created_at),
      })),
      generatedDocuments: generatedDocuments.map(mapGeneratedDocument),
    };
  }

  async createSession(payload) {
    await this.conversationRepository.create({
      id: payload.id,
      title: payload.title,
      provider: payload.provider,
      model: payload.model,
      language: payload.language || payload.currentContext?.language || 'English',
      agentCode: payload.agentCode || 'administrative-assistant',
      currentContext: payload.currentContext,
      metadata: payload.metadata || {},
    });

    await this.promptRepository.replaceConversationPrompt(payload.id, payload.selectedPromptId);
    await this.knowledgeRepository.replaceConversationKnowledge(
      payload.id,
      payload.selectedDocumentIds || []
    );

    return this.getSessionById(payload.id);
  }

  async updateSessionConfig(conversationId, payload) {
    await this.conversationRepository.updateConfig(conversationId, {
      provider: payload.provider,
      model: payload.model,
      language: payload.language || payload.currentContext?.language || 'English',
      agentCode: payload.agentCode || 'administrative-assistant',
      currentContext: payload.currentContext,
      metadata: payload.metadata || {},
    });

    await this.promptRepository.replaceConversationPrompt(conversationId, payload.selectedPromptId);
    await this.knowledgeRepository.replaceConversationKnowledge(
      conversationId,
      payload.selectedDocumentIds || []
    );

    return this.getSessionById(conversationId);
  }

  async getSessionById(conversationId) {
    const conversation = await this.conversationRepository.getById(conversationId);

    if (!conversation) {
      return null;
    }

    const [messages, generatedDocuments, selectedDocumentIds, selectedPromptId] = await Promise.all([
      this.messageRepository.listByConversationId(conversationId),
      this.generatedDocumentRepository.listByConversationId(conversationId),
      this.knowledgeRepository.listConversationKnowledgeIds(conversationId),
      this.promptRepository.getSelectedPromptId(conversationId),
    ]);

    return this.buildSession(
      conversation,
      messages,
      generatedDocuments,
      selectedDocumentIds,
      selectedPromptId
    );
  }

  async listSessions({ limit = 20, offset = 0, search = '', agentCode } = {}) {
    const conversations = await this.conversationRepository.list({ limit, offset, search, agentCode });

    if (conversations.length === 0) {
      return [];
    }

    const conversationIds = conversations.map((conversation) => conversation.id);
    const [messagesByConversation, documentsByConversation, knowledgeByConversation, promptsByConversation] =
      await Promise.all([
        this.messageRepository.listGroupedByConversationIds(conversationIds),
        this.generatedDocumentRepository.listGroupedByConversationIds(conversationIds),
        this.knowledgeRepository.listGroupedConversationKnowledgeIds(conversationIds),
        this.promptRepository.listGroupedSelectedPromptIds(conversationIds),
      ]);

    return conversations.map((conversation) =>
      this.buildSession(
        conversation,
        messagesByConversation.get(conversation.id) || [],
        documentsByConversation.get(conversation.id) || [],
        knowledgeByConversation.get(conversation.id) || [],
        promptsByConversation.get(conversation.id) || null
      )
    );
  }
}
