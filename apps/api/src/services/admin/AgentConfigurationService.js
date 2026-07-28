/**
 * Prepares agent association configuration for prompts, documents, and workflows.
 * Does not invent new business agents — only stores configurable links.
 */
export class AgentConfigurationService {
  constructor({ agentRepository, listDocuments, listPrompts }) {
    this.agentRepository = agentRepository;
    this.listDocuments = listDocuments;
    this.listPrompts = listPrompts;
  }

  getAvailableResources() {
    return {
      prompts: this.listPrompts().map((prompt) => ({
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
      })),
      documents: this.listDocuments().map((document) => ({
        id: document.id,
        title: document.title,
        category: document.category,
      })),
      workflowCodes: [
        { code: 'document-review', label: 'Document Review Workflow' },
        { code: 'export-approval', label: 'Export Approval Workflow' },
        { code: 'archive-flow', label: 'Archive Flow' },
      ],
      providers: [
        { id: 'anthropic', label: 'Anthropic Claude' },
        { id: 'openai', label: 'OpenAI' },
        { id: 'gemini', label: 'Google Gemini' },
        { id: 'ollama', label: 'Ollama' },
      ],
      models: [
        { id: 'claude-3-5-sonnet-latest', provider: 'anthropic' },
        { id: 'claude-3-5-haiku-latest', provider: 'anthropic' },
        { id: 'gpt-4o', provider: 'openai' },
        { id: 'gpt-4o-mini', provider: 'openai' },
        { id: 'gemini-1.5-pro', provider: 'gemini' },
        { id: 'llama3', provider: 'ollama' },
      ],
    };
  }

  listAgentBlueprints() {
    return [
      {
        code: 'community-manager',
        name: 'Community Manager IA',
        description: 'Prepares publications, stories, editorial calendars, and community replies.',
        workflowCodes: ['document-review'],
      },
      {
        code: 'administrative-assistant',
        name: 'Assistant administratif IA',
        description: 'Prepares quotations, invoices, delivery notes, letters, and operational documents.',
        workflowCodes: ['document-review', 'export-approval'],
      },
      {
        code: 'sales-agent',
        name: 'Agent commercial IA',
        description: 'Prepares qualification notes, proposals, follow-ups, and commercial drafts.',
        workflowCodes: ['document-review'],
      },
      {
        code: 'hr-agent',
        name: 'Agent RH IA',
        description: 'Prepares HR letters, role descriptions, follow-up sheets, and staff documents.',
        workflowCodes: ['document-review', 'archive-flow'],
      },
    ];
  }

  async updateConfiguration(agentId, configuration) {
    const existing = await this.agentRepository.getById(agentId);

    if (!existing) {
      throw new Error('Agent not found.');
    }

    return this.agentRepository.update(agentId, {
      ...existing,
      defaultProvider: configuration.defaultProvider ?? existing.defaultProvider,
      defaultModel: configuration.defaultModel ?? existing.defaultModel,
      temperature: configuration.temperature ?? existing.temperature,
      maxTokens: configuration.maxTokens ?? existing.maxTokens,
      timeout: configuration.timeout ?? existing.timeout,
      retryCount: configuration.retryCount ?? existing.retryCount,
      status: configuration.status ?? existing.status,
      promptIds: configuration.promptIds ?? existing.promptIds,
      documentIds: configuration.documentIds ?? existing.documentIds,
      workflowCodes: configuration.workflowCodes ?? existing.workflowCodes,
    });
  }
}
