export class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  createSession(payload) {
    const timestamp = new Date().toISOString();
    const session = {
      id: `session-${Date.now()}`,
      title: payload.title || 'New conversation',
      createdAt: timestamp,
      updatedAt: timestamp,
      selectedPromptId: payload.selectedPromptId,
      selectedDocumentIds: payload.selectedDocumentIds || [],
      currentContext: payload.currentContext,
      model: payload.model,
      provider: payload.provider,
      messages: [],
      generatedDocuments: [],
    };

    this.sessions.set(session.id, session);
    return session;
  }

  listSessions() {
    return Array.from(this.sessions.values()).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  updateSessionConfig(sessionId, payload) {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  appendMessage(sessionId, message) {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      messages: [...session.messages, message],
      updatedAt: new Date().toISOString(),
      title:
        session.messages.length === 0 && message.role === 'user'
          ? message.content.slice(0, 48)
          : session.title,
    };

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  attachGeneratedDocument(sessionId, generatedDocument) {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      generatedDocuments: [generatedDocument, ...(session.generatedDocuments || [])],
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  updateGeneratedDocument(sessionId, documentId, updater) {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const generatedDocuments = (session.generatedDocuments || []).map((document) =>
      document.id === documentId ? updater(document) : document
    );

    const updatedSession = {
      ...session,
      generatedDocuments,
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }
}
