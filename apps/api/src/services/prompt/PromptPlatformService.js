import { randomUUID } from 'node:crypto';
import { defaultPromptLibraries } from '../../data/default-prompt-libraries.js';
import { PromptDefinitionRepository } from '../../repositories/PromptDefinitionRepository.js';

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

const KNOWN_VARIABLES = [
  'company',
  'customer',
  'employee',
  'product',
  'price',
  'language',
  'today',
  'manager',
];

function getDisplayDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

export function extractVariables(text = '') {
  const found = new Set();
  String(text).replace(VARIABLE_PATTERN, (_match, name) => {
    found.add(name);
    return _match;
  });
  return Array.from(found);
}

export function substituteVariables(text = '', variables = {}) {
  return String(text).replace(VARIABLE_PATTERN, (_match, name) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return String(variables[name]);
    }
    return `{{${name}}}`;
  });
}

export function validateVariables(text = '', variables = {}) {
  const required = extractVariables(text);
  const missing = required.filter((name) => {
    const value = variables[name];
    return value == null || String(value).trim() === '';
  });
  const unknown = Object.keys(variables).filter(
    (name) => !required.includes(name) && !KNOWN_VARIABLES.includes(name)
  );
  return {
    required,
    missing,
    unknown,
    knownSuggestions: KNOWN_VARIABLES,
    valid: missing.length === 0,
  };
}

function assemblePromptText(prompt, variables = {}) {
  const sections = [
    `Agent Name: ${prompt.name}`,
    `Description: ${prompt.description}`,
    `Role: ${prompt.role}`,
    `Objective: ${prompt.objective}`,
    '',
    'System Prompt:',
    prompt.systemPrompt,
    '',
    'Instructions:',
    ...(prompt.instructions || []).map((item, index) => `${index + 1}. ${item}`),
    '',
    'Constraints:',
    ...(prompt.constraints || []).map((item, index) => `${index + 1}. ${item}`),
    '',
    'Validation Checklist:',
    ...(prompt.validationChecklist || []).map((item, index) => `${index + 1}. ${item}`),
    '',
    'Output Style:',
    prompt.outputStyle,
  ].join('\n');

  return substituteVariables(sections, {
    today: getDisplayDate(),
    language: prompt.language || 'fr',
    ...variables,
  });
}

export class PromptPlatformService {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.promptRepository = options.promptRepository || new PromptDefinitionRepository(pool);
    this.refreshCaches = options.refreshCaches || (async () => {});
    this.aiGateway = options.aiGateway || null;
    this.retrievalService = options.retrievalService || null;
    this.listDocuments = options.listDocuments || (() => []);
    this.workflowEngine = options.workflowEngine || null;
  }

  async seedLibrariesIfEmpty() {
    const existing = await this.promptRepository.listLibraries();
    if (existing.length > 0) {
      return existing;
    }
    for (const library of defaultPromptLibraries) {
      await this.promptRepository.createLibrary(library);
    }
    return this.promptRepository.listLibraries();
  }

  async getBootstrap() {
    await this.seedLibrariesIfEmpty();
    const [prompts, libraries, dashboard, analytics] = await Promise.all([
      this.promptRepository.list({ limit: 500 }),
      this.promptRepository.listLibraries(),
      this.promptRepository.getDashboardStats(),
      this.promptRepository.getAnalytics(),
    ]);

    return {
      prompts,
      libraries,
      dashboard,
      analytics,
      reviewQueue: prompts.filter(
        (item) => item.status === 'review' || item.status === 'approved'
      ),
      knownVariables: KNOWN_VARIABLES,
    };
  }

  getDashboard() {
    return this.promptRepository.getDashboardStats();
  }

  getAnalytics() {
    return this.promptRepository.getAnalytics();
  }

  async search(filters = {}) {
    const items = await this.promptRepository.list({
      search: filters.search || filters.q,
      status: filters.status,
      category: filters.category,
      libraryId: filters.libraryId,
      owner: filters.owner,
      language: filters.language,
      agent: filters.agent,
      tag: filters.tag,
      sort: filters.sort,
      limit: filters.limit,
      offset: filters.offset,
    });

    let filtered = items;
    if (filters.version != null && filters.version !== '') {
      filtered = filtered.filter((item) => Number(item.version) === Number(filters.version));
    }
    if (filters.model) {
      filtered = filtered.filter((item) =>
        String(item.targetModel || '')
          .toLowerCase()
          .includes(String(filters.model).toLowerCase())
      );
    }
    if (filters.priority != null && filters.priority !== '') {
      filtered = filtered.filter((item) => Number(item.priority) === Number(filters.priority));
    }

    return { items: filtered, total: filtered.length };
  }

  listLibraries() {
    return this.promptRepository.listLibraries();
  }

  createLibrary(payload) {
    return this.promptRepository.createLibrary(payload);
  }

  updateLibrary(id, payload) {
    return this.promptRepository.updateLibrary(id, payload);
  }

  async getPromptDetail(id) {
    const prompt = await this.promptRepository.getById(id);
    if (!prompt) return null;

    const [versions, links, events, testRuns] = await Promise.all([
      this.promptRepository.listVersions(id),
      this.promptRepository.listLinks(id),
      this.promptRepository.listEvents(id),
      this.promptRepository.listTestRuns(id),
    ]);

    return {
      prompt,
      versions,
      links,
      events,
      testRuns,
      variables: this.inspectVariables(prompt),
      timeline: [
        ...events.map((event) => ({
          type: 'event',
          at: event.createdAt,
          label: event.summary || event.eventType,
          actor: event.actor,
        })),
        ...versions.map((version) => ({
          type: 'version',
          at: version.createdAt,
          label: `v${version.version}: ${version.changeSummary}`,
          actor: version.author,
        })),
      ].sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))),
    };
  }

  inspectVariables(prompt) {
    const text = [
      prompt.systemPrompt,
      ...(prompt.instructions || []),
      ...(prompt.constraints || []),
      prompt.outputStyle,
      prompt.description,
    ].join('\n');
    return validateVariables(text, {});
  }

  previewVariables(promptIdOrPrompt, variables = {}) {
    const prompt =
      typeof promptIdOrPrompt === 'string' ? null : promptIdOrPrompt;
    return {
      knownSuggestions: KNOWN_VARIABLES,
      preview: prompt ? assemblePromptText(prompt, variables) : '',
      validation: prompt
        ? validateVariables(
            [
              prompt.systemPrompt,
              ...(prompt.instructions || []),
              ...(prompt.constraints || []),
            ].join('\n'),
            variables
          )
        : { required: [], missing: [], unknown: [], valid: true, knownSuggestions: KNOWN_VARIABLES },
    };
  }

  async createPrompt(payload, actor = '') {
    const prompt = await this.promptRepository.create({
      id: payload.id || `prompt-${Date.now()}`,
      ...payload,
      version: payload.version || 1,
      status: payload.status || 'draft',
      updatedDate: payload.updatedDate || getDisplayDate(),
      tags: payload.tags || [],
    });

    await this.promptRepository.createVersion(prompt, 'Initial version', actor || prompt.author);
    await this.promptRepository.addEvent({
      promptId: prompt.id,
      eventType: 'created',
      actor: actor || prompt.author || prompt.owner,
      summary: 'Prompt created',
    });
    await this.refreshCaches();
    return prompt;
  }

  async updatePrompt(promptId, payload, actor = '', options = {}) {
    const existing = await this.promptRepository.getById(promptId);
    if (!existing) return null;

    const bumpVersion = options.bumpVersion !== false;
    const nextVersion = bumpVersion
      ? Number(existing.version || 1) + 1
      : Number(existing.version || 1);

    const merged = {
      ...existing,
      ...payload,
      tags: payload.tags || existing.tags,
      instructions: payload.instructions || existing.instructions,
      constraints: payload.constraints || existing.constraints,
      validationChecklist: payload.validationChecklist || existing.validationChecklist,
      knowledgeCollectionIds:
        payload.knowledgeCollectionIds || existing.knowledgeCollectionIds,
      updatedDate: getDisplayDate(),
      version: nextVersion,
    };

    const updated = await this.promptRepository.update(promptId, merged);

    if (bumpVersion) {
      await this.promptRepository.createVersion(
        updated,
        options.changeSummary || 'Prompt updated',
        actor || updated.author || updated.owner
      );
    }

    await this.promptRepository.addEvent({
      promptId,
      eventType: 'updated',
      actor: actor || updated.author || updated.owner,
      summary: options.changeSummary || 'Prompt metadata updated',
      metadata: { version: updated.version },
    });
    await this.refreshCaches();
    return updated;
  }

  async removePrompt(promptId, actor = '') {
    const existing = await this.promptRepository.getById(promptId);
    if (!existing) return false;
    const deleted = await this.promptRepository.remove(promptId);
    if (deleted) {
      await this.promptRepository.addEvent({
        promptId,
        eventType: 'deleted',
        actor,
        summary: 'Prompt deleted',
      });
      await this.refreshCaches();
    }
    return deleted;
  }

  async ensureWorkflow(prompt, actor = '') {
    if (!this.workflowEngine || !prompt?.id) {
      return null;
    }

    return this.workflowEngine.createGovernedWorkflow({
      subjectType: 'prompt_definition',
      subjectId: prompt.id,
      workflowDefinitionCode: 'prompt-publication',
      policyCode: 'prompt-policy',
      agentCode: prompt.agentCode || 'prompt-platform',
      priority: prompt.priority >= 3 ? 'high' : 'normal',
      reviewers: ['Prompt Owner'],
      actor: actor || prompt.owner || 'prompt-platform',
      source: 'prompt_platform',
      metadata: {
        name: prompt.name,
        libraryId: prompt.libraryId,
        targetModel: prompt.targetModel,
        requiresHumanApproval: true,
      },
    });
  }

  async governTransition(existing, nextStatus, actor = '', summary = '') {
    if (!this.workflowEngine || !existing?.id) {
      return;
    }

    await this.ensureWorkflow(existing, actor);

    if (nextStatus === 'review') {
      await this.workflowEngine.submitGovernedSubject(
        'prompt_definition',
        existing.id,
        actor || 'prompt-platform',
        summary || 'Prompt submitted for review.'
      );
    }

    if (nextStatus === 'approved' || nextStatus === 'active') {
      const workflow = await this.workflowEngine.approveGovernedSubject(
        'prompt_definition',
        existing.id,
        actor || 'prompt-platform',
        summary || 'Prompt approved.'
      );
      if (workflow.currentState !== 'Approved') {
        const error = new Error('Additional workflow approvals are required before publishing prompts.');
        error.statusCode = 409;
        throw error;
      }
    }

    if (nextStatus === 'draft' && existing.status === 'review') {
      await this.workflowEngine.rejectGovernedSubject(
        'prompt_definition',
        existing.id,
        actor || 'prompt-platform',
        summary || 'Prompt corrections requested.'
      );
    }
  }

  async transitionStatus(promptId, nextStatus, actor = '', summary = '', options = {}) {
    const existing = await this.promptRepository.getById(promptId);
    if (!existing) return null;

    const allowed = {
      draft: ['review', 'archived', 'deprecated'],
      review: ['draft', 'approved', 'archived'],
      approved: ['active', 'review', 'archived'],
      active: ['archived', 'deprecated', 'review'],
      archived: ['draft', 'active', 'deprecated'],
      deprecated: ['archived', 'draft'],
    };

    if (!(allowed[existing.status] || []).includes(nextStatus)) {
      const error = new Error(`Cannot transition from ${existing.status} to ${nextStatus}`);
      error.statusCode = 400;
      throw error;
    }

    if (!options.skipWorkflow) {
      await this.governTransition(existing, nextStatus, actor, summary);
    }

    const patch = { status: nextStatus };

    if (nextStatus === 'approved' || nextStatus === 'active') {
      patch.approvalCount = Number(existing.approvalCount || 0) + 1;
      patch.lastReviewedAt = new Date().toISOString();
      patch.lastReviewedBy = actor;
    }

    if (nextStatus === 'draft' && existing.status === 'review') {
      patch.rejectionCount = Number(existing.rejectionCount || 0) + 1;
    }

    if (nextStatus === 'active') {
      patch.publishedAt = new Date().toISOString();
    }

    const updated = await this.updatePrompt(promptId, patch, actor, {
      changeSummary: summary || `Status changed to ${nextStatus}`,
    });

    await this.promptRepository.addEvent({
      promptId,
      eventType: `status_${nextStatus}`,
      actor,
      summary: summary || `Moved to ${nextStatus}`,
      metadata: { from: existing.status, to: nextStatus },
    });

    return updated;
  }

  submitForReview(promptId, actor = '', comment = '', options = {}) {
    return this.transitionStatus(
      promptId,
      'review',
      actor,
      comment || 'Submitted for review',
      options
    );
  }

  approvePrompt(promptId, actor = '', comment = '', options = {}) {
    return this.transitionStatus(promptId, 'approved', actor, comment || 'Approved', options);
  }

  publishPrompt(promptId, actor = '', comment = '', options = {}) {
    return this.transitionStatus(promptId, 'active', actor, comment || 'Published', options);
  }

  requestCorrections(promptId, actor = '', comment = '', options = {}) {
    return this.transitionStatus(
      promptId,
      'draft',
      actor,
      comment || 'Corrections requested',
      options
    );
  }

  archivePrompt(promptId, actor = '', comment = '', options = {}) {
    return this.transitionStatus(promptId, 'archived', actor, comment || 'Archived', options);
  }

  deprecatePrompt(promptId, actor = '', comment = '', options = {}) {
    return this.transitionStatus(promptId, 'deprecated', actor, comment || 'Deprecated', options);
  }

  restorePrompt(promptId, actor = '', comment = '', options = {}) {
    return this.transitionStatus(promptId, 'active', actor, comment || 'Restored', options);
  }

  listVersions(promptId) {
    return this.promptRepository.listVersions(promptId);
  }

  async compareVersions(promptId, leftVersion, rightVersion) {
    const [left, right] = await Promise.all([
      this.promptRepository.getVersion(promptId, Number(leftVersion)),
      this.promptRepository.getVersion(promptId, Number(rightVersion)),
    ]);
    if (!left || !right) return null;

    return {
      left,
      right,
      differences: {
        name: left.name !== right.name,
        description: left.description !== right.description,
        systemPrompt: left.systemPrompt !== right.systemPrompt,
        snapshotChanged: JSON.stringify(left.snapshot) !== JSON.stringify(right.snapshot),
      },
      sideBySide: {
        leftSystemPrompt: left.systemPrompt,
        rightSystemPrompt: right.systemPrompt,
      },
    };
  }

  async restoreVersion(promptId, version, actor = '') {
    const snapshot = await this.promptRepository.getVersion(promptId, Number(version));
    if (!snapshot) return null;
    const source = snapshot.snapshot?.id ? snapshot.snapshot : snapshot;
    return this.updatePrompt(
      promptId,
      {
        name: source.name,
        description: source.description,
        role: source.role,
        objective: source.objective,
        systemPrompt: source.systemPrompt || snapshot.systemPrompt,
        instructions: source.instructions,
        constraints: source.constraints,
        validationChecklist: source.validationChecklist,
        outputStyle: source.outputStyle,
        tags: source.tags,
        category: source.category,
        libraryId: source.libraryId,
        language: source.language,
        owner: source.owner,
        author: source.author,
        agentCode: source.agentCode,
        targetModel: source.targetModel,
        temperature: source.temperature,
        maxTokens: source.maxTokens,
        notes: source.notes,
        status: source.status === 'active' ? 'draft' : source.status || 'draft',
      },
      actor,
      { changeSummary: `Restored version ${version}` }
    );
  }

  async duplicatePrompt(promptId, actor = '') {
    const existing = await this.promptRepository.getById(promptId);
    if (!existing) return null;
    return this.createPrompt(
      {
        ...existing,
        id: `prompt-${Date.now()}-${randomUUID().slice(0, 8)}`,
        promptGroupId: `group-${Date.now()}`,
        name: `${existing.name} Copy`,
        status: 'draft',
        version: 1,
        usageCount: 0,
        successCount: 0,
        approvalCount: 0,
        rejectionCount: 0,
        publishedAt: null,
      },
      actor
    );
  }

  async cloneVersion(promptId, version, actor = '') {
    const snapshot = await this.promptRepository.getVersion(promptId, Number(version));
    const existing = await this.promptRepository.getById(promptId);
    if (!snapshot || !existing) return null;
    const source = snapshot.snapshot?.name ? snapshot.snapshot : { ...existing, ...snapshot };
    return this.createPrompt(
      {
        ...existing,
        ...source,
        id: `prompt-${Date.now()}-${randomUUID().slice(0, 8)}`,
        promptGroupId: existing.promptGroupId,
        name: `${source.name || existing.name} (clone v${version})`,
        status: 'draft',
        version: 1,
      },
      actor
    );
  }

  listLinks(promptId) {
    return this.promptRepository.listLinks(promptId);
  }

  async addLink(payload, actor = '') {
    const link = await this.promptRepository.addLink(payload);
    await this.promptRepository.addEvent({
      promptId: payload.promptId,
      eventType: 'link_added',
      actor,
      summary: `Linked ${payload.linkedType}:${payload.linkedId}`,
      metadata: payload,
    });
    return link;
  }

  async removeLink(linkId, promptId, actor = '') {
    const removed = await this.promptRepository.removeLink(linkId);
    if (removed && promptId) {
      await this.promptRepository.addEvent({
        promptId,
        eventType: 'link_removed',
        actor,
        summary: `Removed link ${linkId}`,
      });
    }
    return removed;
  }

  async runPlayground(promptId, options = {}) {
    const prompt = await this.promptRepository.getById(promptId);
    if (!prompt) {
      const error = new Error('Prompt not found');
      error.statusCode = 404;
      throw error;
    }

    const variables = {
      today: getDisplayDate(),
      language: prompt.language || 'fr',
      ...(options.variables || {}),
    };
    const validation = validateVariables(
      [
        prompt.systemPrompt,
        ...(prompt.instructions || []),
        ...(prompt.constraints || []),
      ].join('\n'),
      variables
    );

    const assembledPrompt = assemblePromptText(prompt, variables);
    let retrievedKnowledge = 'No retrieved context requested.';

    if (options.includeKnowledge && this.retrievalService) {
      try {
        const retrieval = this.retrievalService.retrieveRelevantContextAsync
          ? await this.retrievalService.retrieveRelevantContextAsync(
              options.question || prompt.objective || prompt.name,
              {
                agentCode: prompt.agentCode,
                promptId: prompt.id,
                collectionIds: prompt.knowledgeCollectionIds || [],
                promptAwareText: assembledPrompt,
              }
            )
          : this.retrievalService.retrieveRelevantContext(
              options.question || prompt.objective || prompt.name
            );
        retrievedKnowledge =
          retrieval?.contextText ||
          retrieval?.assembledContext ||
          (typeof retrieval === 'string' ? retrieval : retrievedKnowledge);
      } catch {
        retrievedKnowledge = 'Knowledge retrieval unavailable for this playground run.';
      }
    }

    const startedAt = Date.now();
    let outputText = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let model = prompt.targetModel || '';
    let latencyMs = 0;

    if (options.dryRun || !this.aiGateway) {
      outputText =
        '[Playground dry-run] Prompt assembled successfully. No production data was modified.';
      latencyMs = Date.now() - startedAt;
      promptTokens = Math.ceil(assembledPrompt.length / 4);
    } else {
      const result = await this.aiGateway.generate({
        model: prompt.targetModel || undefined,
        systemPrompt: assembledPrompt,
        messages: [
          {
            role: 'user',
            content:
              options.userMessage ||
              'Run a non-production playground test for this prompt. Do not take real-world actions.',
          },
        ],
        conversationId: `playground-${promptId}`,
        userId: options.actor || 'prompt-playground',
        agentCode: 'prompt-playground',
      });
      outputText = result?.text || '';
      promptTokens = result?.usage?.promptTokens || 0;
      completionTokens = result?.usage?.completionTokens || 0;
      model = result?.usage?.model || model;
      latencyMs = result?.usage?.durationMs || Date.now() - startedAt;
    }

    const testRun = await this.promptRepository.saveTestRun({
      promptId,
      actor: options.actor || '',
      variables,
      assembledPrompt,
      outputText,
      retrievedKnowledge,
      latencyMs,
      promptTokens,
      completionTokens,
      model,
    });

    // Playground never publishes or mutates lifecycle — only stores isolated test results
    // and optional usage telemetry counters for analytics.
    if (options.recordUsage !== false) {
      const previousLatency = Number(prompt.averageLatencyMs || 0);
      const usageCount = Number(prompt.usageCount || 0) + 1;
      await this.promptRepository.update(promptId, {
        ...prompt,
        usageCount,
        averageLatencyMs:
          previousLatency === 0
            ? latencyMs
            : Number(((previousLatency * (usageCount - 1) + latencyMs) / usageCount).toFixed(1)),
      });
      await this.refreshCaches();
    }

    return {
      testRun,
      validation,
      assembledPrompt,
      retrievedKnowledge,
      outputText,
      latencyMs,
      promptTokens,
      completionTokens,
      model,
      productionUnchanged: true,
    };
  }

  listTestRuns(promptId) {
    return this.promptRepository.listTestRuns(promptId);
  }

  async applyFeedbackSuggestion(promptId, suggestion, actor = '') {
    const existing = await this.promptRepository.getById(promptId);
    if (!existing) return null;

    await this.promptRepository.addEvent({
      promptId,
      eventType: 'feedback_suggestion',
      actor,
      summary: 'Feedback suggestion recorded for reviewer',
      metadata: { suggestion },
    });

    // Nothing updates automatically — suggestion stays pending until a reviewer publishes.
    return {
      promptId,
      status: 'pending_review',
      suggestion,
      message: 'Suggestion stored. Manual review required before any prompt change is published.',
    };
  }
}
