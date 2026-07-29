import { randomUUID } from 'node:crypto';

function asJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function computeCompleteness(prompt) {
  const checks = [
    Boolean(prompt.name),
    Boolean(prompt.description),
    Boolean(prompt.role),
    Boolean(prompt.objective),
    Boolean(prompt.systemPrompt),
    Array.isArray(prompt.instructions) && prompt.instructions.length > 0,
    Array.isArray(prompt.constraints) && prompt.constraints.length > 0,
    Boolean(prompt.outputStyle),
    Boolean(prompt.libraryId || prompt.category),
    Array.isArray(prompt.tags) && prompt.tags.length > 0,
  ];
  return Number(((checks.filter(Boolean).length / checks.length) * 100).toFixed(1));
}

function computeQuality(prompt, completeness) {
  let score = completeness * 0.5;
  if (prompt.status === 'active') score += 20;
  if (prompt.status === 'approved') score += 15;
  if (prompt.status === 'review') score += 8;
  if (prompt.usageCount > 0) score += 5;
  if (prompt.successCount > 0) score += 10;
  if (prompt.approvalCount > prompt.rejectionCount) score += 10;
  if (prompt.feedbackScore) score += Math.min(Number(prompt.feedbackScore), 10);
  if (!prompt.description) score -= 8;
  if (!prompt.tags?.length) score -= 5;
  return Number(Math.max(0, Math.min(100, score)).toFixed(1));
}

export class PromptDefinitionRepository {
  constructor(pool) {
    this.pool = pool;
  }

  mapPrompt(row) {
    if (!row) return null;
    const prompt = {
      id: row.id,
      promptGroupId: row.prompt_group_id,
      version: row.version,
      status: row.status,
      name: row.name,
      description: row.description || '',
      role: row.role,
      objective: row.objective,
      systemPrompt: row.system_prompt,
      instructions: asJson(row.instructions, []),
      constraints: asJson(row.constraints, []),
      validationChecklist: asJson(row.validation_checklist, []),
      outputStyle: row.output_style,
      updatedDate: row.updated_date,
      libraryId: row.library_id || null,
      category: row.category || '',
      tags: asJson(row.tags, []),
      language: row.language || 'fr',
      owner: row.owner || '',
      author: row.author || '',
      priority: Number(row.priority ?? 2),
      agentCode: row.agent_code || '',
      targetModel: row.target_model || '',
      temperature: row.temperature == null ? null : Number(row.temperature),
      maxTokens: row.max_tokens == null ? null : Number(row.max_tokens),
      knowledgeCollectionIds: asJson(row.knowledge_collection_ids, []),
      notes: row.notes || '',
      usageCount: Number(row.usage_count || 0),
      successCount: Number(row.success_count || 0),
      approvalCount: Number(row.approval_count || 0),
      rejectionCount: Number(row.rejection_count || 0),
      feedbackScore: Number(row.feedback_score || 0),
      qualityScore: Number(row.quality_score || 0),
      completenessScore: Number(row.completeness_score || 0),
      lastReviewedAt: row.last_reviewed_at || null,
      lastReviewedBy: row.last_reviewed_by || '',
      publishedAt: row.published_at || null,
      averageLatencyMs: Number(row.average_latency_ms || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    if (!prompt.completenessScore) {
      prompt.completenessScore = computeCompleteness(prompt);
    }
    if (!prompt.qualityScore) {
      prompt.qualityScore = computeQuality(prompt, prompt.completenessScore);
    }

    prompt.missingMetadata = [];
    if (!prompt.description) prompt.missingMetadata.push('description');
    if (!prompt.tags.length) prompt.missingMetadata.push('tags');
    if (!prompt.libraryId) prompt.missingMetadata.push('library');
    if (!prompt.owner && !prompt.author) prompt.missingMetadata.push('owner');
    if (!prompt.agentCode) prompt.missingMetadata.push('agent');
    if (!prompt.targetModel) prompt.missingMetadata.push('targetModel');

    prompt.successRate =
      prompt.usageCount > 0
        ? Number(((prompt.successCount / prompt.usageCount) * 100).toFixed(1))
        : 0;
    prompt.approvalRate =
      prompt.approvalCount + prompt.rejectionCount > 0
        ? Number(
            (
              (prompt.approvalCount / (prompt.approvalCount + prompt.rejectionCount)) *
              100
            ).toFixed(1)
          )
        : 0;

    return prompt;
  }

  mapLibrary(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      owner: row.owner,
      status: row.status,
      language: row.language,
      priority: row.priority,
      version: row.version,
      tags: asJson(row.tags, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async count() {
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM prompt_definitions');
    return result.rows[0]?.count || 0;
  }

  async list(filters = {}) {
    const clauses = [];
    const values = [];

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    if (filters.libraryId) {
      values.push(filters.libraryId);
      clauses.push(`library_id = $${values.length}`);
    }
    if (filters.category) {
      values.push(filters.category);
      clauses.push(`category = $${values.length}`);
    }
    if (filters.agent) {
      values.push(filters.agent);
      clauses.push(`agent_code = $${values.length}`);
    }
    if (filters.language) {
      values.push(filters.language);
      clauses.push(`language = $${values.length}`);
    }
    if (filters.owner) {
      values.push(filters.owner);
      clauses.push(`(owner = $${values.length} OR author = $${values.length})`);
    }
    if (filters.tag) {
      values.push(JSON.stringify([filters.tag]));
      clauses.push(`tags @> $${values.length}::jsonb`);
    }
    if (filters.search) {
      values.push(`%${String(filters.search).toLowerCase()}%`);
      const idx = values.length;
      clauses.push(
        `(LOWER(name) LIKE $${idx} OR LOWER(description) LIKE $${idx} OR LOWER(system_prompt) LIKE $${idx} OR LOWER(tags::text) LIKE $${idx})`
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const order =
      filters.sort === 'usage'
        ? 'usage_count DESC'
        : filters.sort === 'quality'
          ? 'quality_score DESC'
          : filters.sort === 'title'
            ? 'name ASC'
            : 'updated_at DESC';

    const limit = Math.min(Number(filters.limit || 500), 2000);
    const offset = Math.max(Number(filters.offset || 0), 0);
    values.push(limit);
    const limitIdx = values.length;
    values.push(offset);
    const offsetIdx = values.length;

    const result = await this.pool.query(
      `SELECT * FROM prompt_definitions ${where} ORDER BY ${order} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    );
    return result.rows.map((row) => this.mapPrompt(row));
  }

  async getById(id) {
    const result = await this.pool.query('SELECT * FROM prompt_definitions WHERE id = $1 LIMIT 1', [
      id,
    ]);
    return this.mapPrompt(result.rows[0]);
  }

  async create(prompt) {
    const completeness = computeCompleteness(prompt);
    const quality = computeQuality(prompt, completeness);
    await this.pool.query(
      `
        INSERT INTO prompt_definitions (
          id, prompt_group_id, version, status, name, description, role, objective,
          system_prompt, instructions, constraints, validation_checklist, output_style, updated_date,
          library_id, category, tags, language, owner, author, priority, agent_code,
          target_model, temperature, max_tokens, knowledge_collection_ids, notes,
          usage_count, success_count, approval_count, rejection_count, feedback_score,
          quality_score, completeness_score, last_reviewed_by
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,
          $15,$16,$17::jsonb,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27,
          $28,$29,$30,$31,$32,$33,$34,$35
        )
      `,
      [
        prompt.id,
        prompt.promptGroupId,
        prompt.version || 1,
        prompt.status || 'draft',
        prompt.name,
        prompt.description || '',
        prompt.role,
        prompt.objective,
        prompt.systemPrompt,
        JSON.stringify(prompt.instructions || []),
        JSON.stringify(prompt.constraints || []),
        JSON.stringify(prompt.validationChecklist || []),
        prompt.outputStyle,
        prompt.updatedDate,
        prompt.libraryId || null,
        prompt.category || '',
        JSON.stringify(prompt.tags || []),
        prompt.language || 'fr',
        prompt.owner || '',
        prompt.author || '',
        prompt.priority ?? 2,
        prompt.agentCode || '',
        prompt.targetModel || '',
        prompt.temperature ?? null,
        prompt.maxTokens ?? null,
        JSON.stringify(prompt.knowledgeCollectionIds || []),
        prompt.notes || '',
        prompt.usageCount || 0,
        prompt.successCount || 0,
        prompt.approvalCount || 0,
        prompt.rejectionCount || 0,
        prompt.feedbackScore || 0,
        quality,
        completeness,
        prompt.lastReviewedBy || '',
      ]
    );

    return this.getById(prompt.id);
  }

  async update(id, prompt) {
    const completeness = computeCompleteness(prompt);
    const quality = computeQuality(prompt, completeness);
    await this.pool.query(
      `
        UPDATE prompt_definitions
        SET
          prompt_group_id = $2,
          version = $3,
          status = $4,
          name = $5,
          description = $6,
          role = $7,
          objective = $8,
          system_prompt = $9,
          instructions = $10::jsonb,
          constraints = $11::jsonb,
          validation_checklist = $12::jsonb,
          output_style = $13,
          updated_date = $14,
          library_id = $15,
          category = $16,
          tags = $17::jsonb,
          language = $18,
          owner = $19,
          author = $20,
          priority = $21,
          agent_code = $22,
          target_model = $23,
          temperature = $24,
          max_tokens = $25,
          knowledge_collection_ids = $26::jsonb,
          notes = $27,
          usage_count = $28,
          success_count = $29,
          approval_count = $30,
          rejection_count = $31,
          feedback_score = $32,
          quality_score = $33,
          completeness_score = $34,
          last_reviewed_at = $35,
          last_reviewed_by = $36,
          published_at = $37,
          average_latency_ms = $38,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        prompt.promptGroupId,
        prompt.version,
        prompt.status,
        prompt.name,
        prompt.description || '',
        prompt.role,
        prompt.objective,
        prompt.systemPrompt,
        JSON.stringify(prompt.instructions || []),
        JSON.stringify(prompt.constraints || []),
        JSON.stringify(prompt.validationChecklist || []),
        prompt.outputStyle,
        prompt.updatedDate,
        prompt.libraryId || null,
        prompt.category || '',
        JSON.stringify(prompt.tags || []),
        prompt.language || 'fr',
        prompt.owner || '',
        prompt.author || '',
        prompt.priority ?? 2,
        prompt.agentCode || '',
        prompt.targetModel || '',
        prompt.temperature ?? null,
        prompt.maxTokens ?? null,
        JSON.stringify(prompt.knowledgeCollectionIds || []),
        prompt.notes || '',
        prompt.usageCount || 0,
        prompt.successCount || 0,
        prompt.approvalCount || 0,
        prompt.rejectionCount || 0,
        prompt.feedbackScore || 0,
        quality,
        completeness,
        prompt.lastReviewedAt || null,
        prompt.lastReviewedBy || '',
        prompt.publishedAt || null,
        prompt.averageLatencyMs || 0,
      ]
    );

    return this.getById(id);
  }

  async remove(id) {
    const result = await this.pool.query('DELETE FROM prompt_definitions WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async listLibraries() {
    const result = await this.pool.query(
      'SELECT * FROM prompt_libraries ORDER BY priority DESC, name ASC'
    );
    return result.rows.map((row) => this.mapLibrary(row));
  }

  async createLibrary(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO prompt_libraries (
        id, name, description, owner, status, language, priority, version, tags
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        id,
        payload.name,
        payload.description || '',
        payload.owner || '',
        payload.status || 'active',
        payload.language || 'fr',
        payload.priority ?? 2,
        payload.version || 1,
        JSON.stringify(payload.tags || []),
      ]
    );
    const result = await this.pool.query('SELECT * FROM prompt_libraries WHERE id = $1', [id]);
    return this.mapLibrary(result.rows[0]);
  }

  async updateLibrary(id, payload) {
    const existing = (await this.listLibraries()).find((item) => item.id === id);
    if (!existing) return null;
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE prompt_libraries SET
        name=$2, description=$3, owner=$4, status=$5, language=$6, priority=$7,
        version=$8, tags=$9::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.name,
        next.description || '',
        next.owner || '',
        next.status || 'active',
        next.language || 'fr',
        next.priority ?? 2,
        next.version || 1,
        JSON.stringify(next.tags || []),
      ]
    );
    const result = await this.pool.query('SELECT * FROM prompt_libraries WHERE id = $1', [id]);
    return this.mapLibrary(result.rows[0]);
  }

  async createVersion(prompt, changeSummary = '', author = '') {
    const id = randomUUID();
    const version = Number(prompt.version || 1);
    await this.pool.query(
      `INSERT INTO prompt_definition_versions (
        id, prompt_id, version, name, description, system_prompt, author, change_summary, snapshot
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        id,
        prompt.id,
        version,
        prompt.name,
        prompt.description || '',
        prompt.systemPrompt || '',
        author || prompt.author || prompt.owner || '',
        changeSummary || `Version ${version}`,
        JSON.stringify(prompt),
      ]
    );
    return (await this.listVersions(prompt.id)).find((item) => item.id === id);
  }

  async listVersions(promptId) {
    const result = await this.pool.query(
      `SELECT * FROM prompt_definition_versions WHERE prompt_id = $1 ORDER BY version DESC`,
      [promptId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      promptId: row.prompt_id,
      version: row.version,
      name: row.name,
      description: row.description,
      systemPrompt: row.system_prompt,
      author: row.author,
      changeSummary: row.change_summary,
      snapshot: asJson(row.snapshot, {}),
      createdAt: row.created_at,
    }));
  }

  async getVersion(promptId, version) {
    const result = await this.pool.query(
      `SELECT * FROM prompt_definition_versions WHERE prompt_id = $1 AND version = $2 LIMIT 1`,
      [promptId, version]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      promptId: row.prompt_id,
      version: row.version,
      name: row.name,
      description: row.description,
      systemPrompt: row.system_prompt,
      author: row.author,
      changeSummary: row.change_summary,
      snapshot: asJson(row.snapshot, {}),
      createdAt: row.created_at,
    };
  }

  async addLink(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO prompt_definition_links (id, prompt_id, linked_type, linked_id, label)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, payload.promptId, payload.linkedType, payload.linkedId, payload.label || '']
    );
    return (await this.listLinks(payload.promptId)).find((item) => item.id === id);
  }

  async listLinks(promptId) {
    const result = await this.pool.query(
      `SELECT * FROM prompt_definition_links WHERE prompt_id = $1 ORDER BY created_at DESC`,
      [promptId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      promptId: row.prompt_id,
      linkedType: row.linked_type,
      linkedId: row.linked_id,
      label: row.label,
      createdAt: row.created_at,
    }));
  }

  async removeLink(id) {
    const result = await this.pool.query('DELETE FROM prompt_definition_links WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async addEvent(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO prompt_definition_events (id, prompt_id, event_type, actor, summary, metadata)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      [
        id,
        payload.promptId,
        payload.eventType,
        payload.actor || '',
        payload.summary || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return id;
  }

  async listEvents(promptId) {
    const result = await this.pool.query(
      `SELECT * FROM prompt_definition_events WHERE prompt_id = $1 ORDER BY created_at DESC`,
      [promptId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      promptId: row.prompt_id,
      eventType: row.event_type,
      actor: row.actor,
      summary: row.summary,
      metadata: asJson(row.metadata, {}),
      createdAt: row.created_at,
    }));
  }

  async saveTestRun(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO prompt_test_runs (
        id, prompt_id, actor, variables, assembled_prompt, output_text, retrieved_knowledge,
        latency_ms, prompt_tokens, completion_tokens, model
      ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        payload.promptId,
        payload.actor || '',
        JSON.stringify(payload.variables || {}),
        payload.assembledPrompt || '',
        payload.outputText || '',
        payload.retrievedKnowledge || '',
        payload.latencyMs || 0,
        payload.promptTokens || 0,
        payload.completionTokens || 0,
        payload.model || '',
      ]
    );
    return this.listTestRuns(payload.promptId).then((items) => items.find((item) => item.id === id));
  }

  async listTestRuns(promptId) {
    const result = await this.pool.query(
      `SELECT * FROM prompt_test_runs WHERE prompt_id = $1 ORDER BY created_at DESC`,
      [promptId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      promptId: row.prompt_id,
      actor: row.actor,
      variables: asJson(row.variables, {}),
      assembledPrompt: row.assembled_prompt,
      outputText: row.output_text,
      retrievedKnowledge: row.retrieved_knowledge,
      latencyMs: row.latency_ms,
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      model: row.model,
      createdAt: row.created_at,
    }));
  }

  async getDashboardStats() {
    const prompts = await this.list({ limit: 2000 });
    const libraries = await this.listLibraries();
    const published = prompts.filter((item) => item.status === 'active').length;
    const drafts = prompts.filter((item) => item.status === 'draft').length;
    const archived = prompts.filter((item) => item.status === 'archived').length;
    const pendingReviews = prompts.filter(
      (item) => item.status === 'review' || item.status === 'approved'
    ).length;
    const feedbackScores = prompts.filter((item) => item.feedbackScore > 0);
    const approvalRates = prompts.filter((item) => item.approvalCount + item.rejectionCount > 0);

    return {
      totalPrompts: prompts.length,
      publishedPrompts: published,
      draftPrompts: drafts,
      archivedPrompts: archived,
      pendingReviews,
      mostUsed: [...prompts].sort((a, b) => b.usageCount - a.usageCount).slice(0, 5),
      recentlyEdited: [...prompts]
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .slice(0, 5),
      recentlyPublished: prompts
        .filter((item) => item.publishedAt || item.status === 'active')
        .sort((a, b) =>
          String(b.publishedAt || b.updatedAt || '').localeCompare(
            String(a.publishedAt || a.updatedAt || '')
          )
        )
        .slice(0, 5),
      mostSuccessful: [...prompts]
        .sort((a, b) => b.successRate - a.successRate || b.successCount - a.successCount)
        .slice(0, 5),
      averageFeedback: feedbackScores.length
        ? Number(
            (
              feedbackScores.reduce((sum, item) => sum + item.feedbackScore, 0) /
              feedbackScores.length
            ).toFixed(1)
          )
        : 0,
      averageApprovalRate: approvalRates.length
        ? Number(
            (
              approvalRates.reduce((sum, item) => sum + item.approvalRate, 0) /
              approvalRates.length
            ).toFixed(1)
          )
        : 0,
      libraries: libraries.length,
    };
  }

  async getAnalytics() {
    const prompts = await this.list({ limit: 2000 });
    const libraries = await this.listLibraries();
    const unused = prompts.filter((item) => item.usageCount === 0);

    return {
      mostUsed: [...prompts].sort((a, b) => b.usageCount - a.usageCount).slice(0, 10),
      unusedPrompts: unused.slice(0, 20),
      highestRated: [...prompts].sort((a, b) => b.feedbackScore - a.feedbackScore).slice(0, 10),
      lowestRated: [...prompts]
        .filter((item) => item.feedbackScore > 0)
        .sort((a, b) => a.feedbackScore - b.feedbackScore)
        .slice(0, 10),
      averageResponseTime: prompts.length
        ? Number(
            (
              prompts.reduce((sum, item) => sum + Number(item.averageLatencyMs || 0), 0) /
              prompts.length
            ).toFixed(1)
          )
        : 0,
      averageFeedback: prompts.length
        ? Number(
            (
              prompts.reduce((sum, item) => sum + Number(item.feedbackScore || 0), 0) /
              prompts.length
            ).toFixed(1)
          )
        : 0,
      approvalRate: prompts.length
        ? Number(
            (prompts.reduce((sum, item) => sum + item.approvalRate, 0) / prompts.length).toFixed(1)
          )
        : 0,
      promptGrowth: {
        total: prompts.length,
        published: prompts.filter((item) => item.status === 'active').length,
        draft: prompts.filter((item) => item.status === 'draft').length,
        review: prompts.filter((item) => item.status === 'review').length,
      },
      librariesUsage: libraries.map((library) => ({
        id: library.id,
        name: library.name,
        prompts: prompts.filter((item) => item.libraryId === library.id).length,
      })),
      versionActivity: prompts
        .flatMap((item) => [{ promptId: item.id, version: item.version, name: item.name }])
        .sort((a, b) => b.version - a.version)
        .slice(0, 20),
    };
  }
}

export { computeCompleteness, computeQuality };
