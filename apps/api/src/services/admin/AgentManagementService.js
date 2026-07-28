export class AgentManagementService {
  constructor(agentRepository) {
    this.agentRepository = agentRepository;
  }

  listAgents() {
    return this.agentRepository.list();
  }

  getAgent(id) {
    return this.agentRepository.getById(id);
  }

  async createAgent(payload) {
    if (!payload.code || !payload.name) {
      throw new Error('Agent code and name are required.');
    }

    return this.agentRepository.create({
      id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...payload,
    });
  }

  async updateAgent(id, payload) {
    const existing = await this.agentRepository.getById(id);

    if (!existing) {
      throw new Error('Agent not found.');
    }

    return this.agentRepository.update(id, {
      ...existing,
      ...payload,
      promptIds: payload.promptIds ?? existing.promptIds,
      documentIds: payload.documentIds ?? existing.documentIds,
      workflowCodes: payload.workflowCodes ?? existing.workflowCodes,
    });
  }

  async deleteAgent(id) {
    const existing = await this.agentRepository.getById(id);

    if (!existing) {
      throw new Error('Agent not found.');
    }

    await this.agentRepository.delete(id);
    return { deleted: true, id };
  }
}
