export class ConversationService {
  constructor({
    aiGateway,
    promptAssembler,
    retrievalService,
    feedbackService,
    sessionRepository,
    messageRepository,
    promptRepository,
    knowledgeRepository,
  }) {
    this.aiGateway = aiGateway;
    this.promptAssembler = promptAssembler;
    this.retrievalService = retrievalService;
    this.feedbackService = feedbackService;
    this.sessionRepository = sessionRepository;
    this.messageRepository = messageRepository;
    this.promptRepository = promptRepository;
    this.knowledgeRepository = knowledgeRepository;
  }

  async createSession(payload) {
    return this.sessionRepository.createSession({
      ...payload,
      id: `session-${Date.now()}`,
    });
  }

  async listSessions() {
    return this.sessionRepository.listSessions();
  }

  async getSession(sessionId) {
    return this.sessionRepository.getSessionById(sessionId);
  }

  async sendMessage({
    sessionId,
    provider,
    model,
    selectedPromptId,
    selectedDocumentIds,
    currentContext,
    userMessage,
  }) {
    const prompt = this.promptRepository.getPromptById(selectedPromptId);

    if (!prompt) {
      throw new Error('Selected prompt was not found.');
    }

    const selectedDocuments = this.knowledgeRepository.getDocumentsByIds(selectedDocumentIds);

    const retrievedContext = this.retrievalService.retrieveRelevantContext(userMessage);
    const approvedGuidance = this.feedbackService
      ? await this.feedbackService.getApprovedGuidance()
      : '';
    const enrichedRetrievedContext = approvedGuidance
      ? {
          ...retrievedContext,
          assembledContext: `${retrievedContext.assembledContext}\n\nApproved Feedback Guidance:\n${approvedGuidance}`,
        }
      : retrievedContext;

    const assembledPrompt = this.promptAssembler.assemble({
      prompt,
      selectedDocuments,
      currentContext,
      retrievedContext: enrichedRetrievedContext,
    });

    const existingSession = await this.getSession(sessionId);

    if (!existingSession) {
      throw new Error('Conversation session was not found.');
    }

    const updatedSession = await this.sessionRepository.updateSessionConfig(sessionId, {
      provider,
      model,
      selectedPromptId,
      selectedDocumentIds,
      currentContext,
      language: currentContext.language,
    });

    const historyMessages = updatedSession.messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const userEntry = this.createMessage('user', userMessage);
    await this.messageRepository.create({
      ...userEntry,
      conversationId: sessionId,
      createdAt: new Date().toISOString(),
    });

    const providerResponse = await this.aiGateway.generate({
      provider,
      model,
      systemPrompt: assembledPrompt,
      messages: [...historyMessages, { role: 'user', content: userMessage }],
      conversationId: sessionId,
    });

    const assistantEntry = this.createMessage('assistant', providerResponse.text);
    await this.messageRepository.create({
      ...assistantEntry,
      conversationId: sessionId,
      createdAt: new Date().toISOString(),
    });
    const sessionAfterAssistantResponse = await this.getSession(sessionId);

    return {
      session: sessionAfterAssistantResponse,
      assistantMessage: assistantEntry,
      requestPreview: {
        provider,
        model,
        assembledPrompt,
        retrieval: enrichedRetrievedContext,
        usage: providerResponse.usage || null,
      },
    };
  }

  createMessage(role, content) {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      createdAt: new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }
}
