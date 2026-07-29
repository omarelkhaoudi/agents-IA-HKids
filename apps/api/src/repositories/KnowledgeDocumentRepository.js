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

function computeCompleteness(document) {
  const checks = [
    Boolean(document.title),
    Boolean(document.description),
    Boolean(document.category),
    Boolean(document.author || document.owner),
    Array.isArray(document.tags) && document.tags.length > 0,
    Boolean(document.collectionId),
    Boolean(document.language),
    Boolean(document.content || document.description),
  ];
  const score = (checks.filter(Boolean).length / checks.length) * 100;
  return Number(score.toFixed(1));
}

function computeQuality(document, completeness) {
  let score = completeness * 0.5;
  if (document.status === 'active') score += 20;
  if (document.status === 'review') score += 10;
  if (document.viewCount > 0) score += 5;
  if (document.aiUsageCount > 0) score += 10;
  if (document.approvalCount > document.rejectionCount) score += 10;
  if (document.feedbackScore) score += Math.min(Number(document.feedbackScore), 10);
  if (!document.description) score -= 10;
  if (!document.tags?.length) score -= 5;
  return Number(Math.max(0, Math.min(100, score)).toFixed(1));
}

export class KnowledgeDocumentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  mapDocument(row) {
    if (!row) return null;
    const document = {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      tags: asJson(row.tags, []),
      createdDate: row.created_date,
      updatedDate: row.updated_date,
      size: row.size,
      status: row.status,
      author: row.author,
      fileType: row.file_type,
      sourceFileName: row.source_file_name,
      content: row.content,
      priority: row.priority,
      collectionId: row.collection_id || null,
      language: row.language || 'fr',
      owner: row.owner || row.author || '',
      version: row.version || 1,
      reviewDate: row.review_date || '',
      expirationDate: row.expiration_date || '',
      notes: row.notes || '',
      viewCount: Number(row.view_count || 0),
      aiUsageCount: Number(row.ai_usage_count || 0),
      approvalCount: Number(row.approval_count || 0),
      rejectionCount: Number(row.rejection_count || 0),
      feedbackScore: Number(row.feedback_score || 0),
      qualityScore: Number(row.quality_score || 0),
      completenessScore: Number(row.completeness_score || 0),
      lastReviewedAt: row.last_reviewed_at || null,
      lastReviewedBy: row.last_reviewed_by || '',
      deletedAt: row.deleted_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    if (!document.completenessScore) {
      document.completenessScore = computeCompleteness(document);
    }
    if (!document.qualityScore) {
      document.qualityScore = computeQuality(document, document.completenessScore);
    }

    document.missingMetadata = [];
    if (!document.description) document.missingMetadata.push('description');
    if (!document.tags.length) document.missingMetadata.push('tags');
    if (!document.collectionId) document.missingMetadata.push('collection');
    if (!document.owner && !document.author) document.missingMetadata.push('owner');
    if (!document.language) document.missingMetadata.push('language');

    return document;
  }

  mapCollection(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      owner: row.owner,
      status: row.status,
      priority: row.priority,
      language: row.language,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async count() {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS count FROM knowledge_documents WHERE deleted_at IS NULL AND status <> 'deleted'`
    );
    return result.rows[0]?.count || 0;
  }

  async list(filters = {}) {
    const clauses = [];
    const values = [];

    if (!filters.includeDeleted) {
      clauses.push(`deleted_at IS NULL`);
      clauses.push(`status <> 'deleted'`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    if (filters.category) {
      values.push(filters.category);
      clauses.push(`category = $${values.length}`);
    }
    if (filters.collectionId) {
      values.push(filters.collectionId);
      clauses.push(`collection_id = $${values.length}`);
    }
    if (filters.owner) {
      values.push(filters.owner);
      clauses.push(`(owner = $${values.length} OR author = $${values.length})`);
    }
    if (filters.language) {
      values.push(filters.language);
      clauses.push(`language = $${values.length}`);
    }
    if (filters.tag) {
      values.push(JSON.stringify([filters.tag]));
      clauses.push(`tags @> $${values.length}::jsonb`);
    }
    if (filters.search) {
      values.push(`%${String(filters.search).toLowerCase()}%`);
      const idx = values.length;
      clauses.push(
        `(LOWER(title) LIKE $${idx} OR LOWER(description) LIKE $${idx} OR LOWER(COALESCE(content,'')) LIKE $${idx} OR LOWER(tags::text) LIKE $${idx})`
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const order =
      filters.sort === 'views'
        ? 'view_count DESC'
        : filters.sort === 'ai'
          ? 'ai_usage_count DESC'
          : filters.sort === 'title'
            ? 'title ASC'
            : 'updated_at DESC';

    const limit = Math.min(Number(filters.limit || 500), 2000);
    const offset = Math.max(Number(filters.offset || 0), 0);
    values.push(limit);
    const limitIdx = values.length;
    values.push(offset);
    const offsetIdx = values.length;

    const result = await this.pool.query(
      `SELECT * FROM knowledge_documents ${where} ORDER BY ${order} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    );
    return result.rows.map((row) => this.mapDocument(row));
  }

  async listSources() {
    const result = await this.pool.query(
      `SELECT id, content, priority FROM knowledge_documents
       WHERE deleted_at IS NULL AND status IN ('active', 'review')
       ORDER BY created_at DESC`
    );

    return result.rows.map((row) => ({
      documentId: row.id,
      content: row.content,
      priority: row.priority,
    }));
  }

  async getById(id) {
    const result = await this.pool.query('SELECT * FROM knowledge_documents WHERE id = $1 LIMIT 1', [
      id,
    ]);
    return this.mapDocument(result.rows[0]);
  }

  async create(document) {
    const completeness = computeCompleteness(document);
    const quality = computeQuality(document, completeness);
    await this.pool.query(
      `
        INSERT INTO knowledge_documents (
          id, title, category, description, tags, created_date, updated_date,
          size, status, author, file_type, source_file_name, content, priority,
          collection_id, language, owner, version, review_date, expiration_date, notes,
          view_count, ai_usage_count, approval_count, rejection_count, feedback_score,
          quality_score, completeness_score, last_reviewed_by
        )
        VALUES (
          $1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
        )
      `,
      [
        document.id,
        document.title,
        document.category,
        document.description || '',
        JSON.stringify(document.tags || []),
        document.createdDate,
        document.updatedDate,
        document.size || '',
        document.status || 'draft',
        document.author || '',
        document.fileType || 'PDF',
        document.sourceFileName || '',
        document.content || '',
        document.priority || 2,
        document.collectionId || null,
        document.language || 'fr',
        document.owner || document.author || '',
        document.version || 1,
        document.reviewDate || '',
        document.expirationDate || '',
        document.notes || '',
        document.viewCount || 0,
        document.aiUsageCount || 0,
        document.approvalCount || 0,
        document.rejectionCount || 0,
        document.feedbackScore || 0,
        quality,
        completeness,
        document.lastReviewedBy || '',
      ]
    );

    return this.getById(document.id);
  }

  async update(id, document) {
    const completeness = computeCompleteness(document);
    const quality = computeQuality(document, completeness);
    await this.pool.query(
      `
        UPDATE knowledge_documents
        SET
          title = $2,
          category = $3,
          description = $4,
          tags = $5::jsonb,
          updated_date = $6,
          size = $7,
          status = $8,
          author = $9,
          file_type = $10,
          source_file_name = $11,
          content = $12,
          priority = $13,
          collection_id = $14,
          language = $15,
          owner = $16,
          version = $17,
          review_date = $18,
          expiration_date = $19,
          notes = $20,
          view_count = $21,
          ai_usage_count = $22,
          approval_count = $23,
          rejection_count = $24,
          feedback_score = $25,
          quality_score = $26,
          completeness_score = $27,
          last_reviewed_at = $28,
          last_reviewed_by = $29,
          deleted_at = $30,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        document.title,
        document.category,
        document.description || '',
        JSON.stringify(document.tags || []),
        document.updatedDate,
        document.size || '',
        document.status || 'draft',
        document.author || '',
        document.fileType || 'PDF',
        document.sourceFileName || '',
        document.content || '',
        document.priority || 2,
        document.collectionId || null,
        document.language || 'fr',
        document.owner || document.author || '',
        document.version || 1,
        document.reviewDate || '',
        document.expirationDate || '',
        document.notes || '',
        document.viewCount || 0,
        document.aiUsageCount || 0,
        document.approvalCount || 0,
        document.rejectionCount || 0,
        document.feedbackScore || 0,
        quality,
        completeness,
        document.lastReviewedAt || null,
        document.lastReviewedBy || '',
        document.deletedAt || null,
      ]
    );

    return this.getById(id);
  }

  async remove(id) {
    const existing = await this.getById(id);
    if (!existing) return false;
    await this.update(id, {
      ...existing,
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      updatedDate: existing.updatedDate,
    });
    return true;
  }

  async hardRemove(id) {
    const result = await this.pool.query('DELETE FROM knowledge_documents WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async listCollections() {
    const result = await this.pool.query(
      'SELECT * FROM knowledge_collections ORDER BY priority DESC, name ASC'
    );
    return result.rows.map((row) => this.mapCollection(row));
  }

  async createCollection(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO knowledge_collections (
        id, name, description, icon, color, owner, status, priority, language
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        payload.name,
        payload.description || '',
        payload.icon || 'folder',
        payload.color || 'cyan',
        payload.owner || '',
        payload.status || 'active',
        payload.priority ?? 2,
        payload.language || 'fr',
      ]
    );
    const result = await this.pool.query('SELECT * FROM knowledge_collections WHERE id = $1', [id]);
    return this.mapCollection(result.rows[0]);
  }

  async updateCollection(id, payload) {
    const existing = (await this.listCollections()).find((item) => item.id === id);
    if (!existing) return null;
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE knowledge_collections SET
        name=$2, description=$3, icon=$4, color=$5, owner=$6, status=$7, priority=$8,
        language=$9, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.name,
        next.description || '',
        next.icon || 'folder',
        next.color || 'cyan',
        next.owner || '',
        next.status || 'active',
        next.priority ?? 2,
        next.language || 'fr',
      ]
    );
    const result = await this.pool.query('SELECT * FROM knowledge_collections WHERE id = $1', [id]);
    return this.mapCollection(result.rows[0]);
  }

  async createVersion(document, changeSummary = '', author = '') {
    const id = randomUUID();
    const version = Number(document.version || 1);
    await this.pool.query(
      `INSERT INTO knowledge_document_versions (
        id, document_id, version, title, description, content, tags, author, change_summary, snapshot
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb)`,
      [
        id,
        document.id,
        version,
        document.title,
        document.description || '',
        document.content || '',
        JSON.stringify(document.tags || []),
        author || document.author || document.owner || '',
        changeSummary || `Version ${version}`,
        JSON.stringify(document),
      ]
    );
    return this.listVersions(document.id).then((items) => items.find((item) => item.id === id));
  }

  async listVersions(documentId) {
    const result = await this.pool.query(
      `SELECT * FROM knowledge_document_versions WHERE document_id = $1 ORDER BY version DESC`,
      [documentId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      version: row.version,
      title: row.title,
      description: row.description,
      content: row.content,
      tags: asJson(row.tags, []),
      author: row.author,
      changeSummary: row.change_summary,
      snapshot: asJson(row.snapshot, {}),
      createdAt: row.created_at,
    }));
  }

  async getVersion(documentId, version) {
    const result = await this.pool.query(
      `SELECT * FROM knowledge_document_versions WHERE document_id = $1 AND version = $2 LIMIT 1`,
      [documentId, version]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      documentId: row.document_id,
      version: row.version,
      title: row.title,
      description: row.description,
      content: row.content,
      tags: asJson(row.tags, []),
      author: row.author,
      changeSummary: row.change_summary,
      snapshot: asJson(row.snapshot, {}),
      createdAt: row.created_at,
    };
  }

  async addLink(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO knowledge_document_links (id, document_id, linked_type, linked_id, label)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, payload.documentId, payload.linkedType, payload.linkedId, payload.label || '']
    );
    return this.listLinks(payload.documentId).then((items) => items.find((item) => item.id === id));
  }

  async listLinks(documentId) {
    const result = await this.pool.query(
      `SELECT * FROM knowledge_document_links WHERE document_id = $1 ORDER BY created_at DESC`,
      [documentId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      linkedType: row.linked_type,
      linkedId: row.linked_id,
      label: row.label,
      createdAt: row.created_at,
    }));
  }

  async removeLink(id) {
    const result = await this.pool.query('DELETE FROM knowledge_document_links WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async addEvent(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO knowledge_document_events (id, document_id, event_type, actor, summary, metadata)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      [
        id,
        payload.documentId,
        payload.eventType,
        payload.actor || '',
        payload.summary || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return id;
  }

  async listEvents(documentId) {
    const result = await this.pool.query(
      `SELECT * FROM knowledge_document_events WHERE document_id = $1 ORDER BY created_at DESC`,
      [documentId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      eventType: row.event_type,
      actor: row.actor,
      summary: row.summary,
      metadata: asJson(row.metadata, {}),
      createdAt: row.created_at,
    }));
  }

  async listTags() {
    const result = await this.pool.query('SELECT * FROM knowledge_tags ORDER BY usage_count DESC, name ASC');
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      parentId: row.parent_id,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async upsertTag(payload) {
    const existing = (await this.listTags()).find(
      (tag) => tag.name.toLowerCase() === String(payload.name || '').toLowerCase()
    );
    if (existing) {
      await this.pool.query(
        `UPDATE knowledge_tags SET color=$2, parent_id=$3, usage_count=$4, updated_at=NOW() WHERE id=$1`,
        [
          existing.id,
          payload.color || existing.color,
          payload.parentId || existing.parentId || null,
          payload.usageCount ?? existing.usageCount + 1,
        ]
      );
      return (await this.listTags()).find((tag) => tag.id === existing.id);
    }

    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO knowledge_tags (id, name, color, parent_id, usage_count) VALUES ($1,$2,$3,$4,$5)`,
      [id, payload.name, payload.color || 'slate', payload.parentId || null, payload.usageCount ?? 1]
    );
    return (await this.listTags()).find((tag) => tag.id === id);
  }

  async mergeTags(sourceName, targetName) {
    const docs = await this.list({ includeDeleted: false });
    for (const document of docs) {
      if (!document.tags.map((tag) => tag.toLowerCase()).includes(sourceName.toLowerCase())) {
        continue;
      }
      const nextTags = Array.from(
        new Set(
          document.tags
            .map((tag) => (tag.toLowerCase() === sourceName.toLowerCase() ? targetName : tag))
            .filter(Boolean)
        )
      );
      await this.update(document.id, { ...document, tags: nextTags });
    }
    await this.pool.query('DELETE FROM knowledge_tags WHERE LOWER(name) = LOWER($1)', [sourceName]);
    return this.upsertTag({ name: targetName });
  }

  async getDashboardStats() {
    const documents = await this.list({ includeDeleted: false });
    const collections = await this.listCollections();
    const tags = await this.listTags();
    const pendingReviews = documents.filter((item) => item.status === 'review').length;
    const published = documents.filter((item) => item.status === 'active').length;
    const drafts = documents.filter((item) => item.status === 'draft').length;
    const archived = documents.filter((item) => item.status === 'archived').length;
    const qualityScore =
      documents.length > 0
        ? Number(
            (
              documents.reduce((sum, item) => sum + Number(item.qualityScore || 0), 0) /
              documents.length
            ).toFixed(1)
          )
        : 0;

    return {
      totalDocuments: documents.length,
      collections: collections.length,
      categories: new Set(documents.map((item) => item.category).filter(Boolean)).size,
      tags: tags.length || new Set(documents.flatMap((item) => item.tags)).size,
      pendingReviews,
      published,
      drafts,
      archived,
      mostViewed: [...documents].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
      mostUsedByAi: [...documents].sort((a, b) => b.aiUsageCount - a.aiUsageCount).slice(0, 5),
      recentlyUpdated: [...documents]
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .slice(0, 5),
      recentlyUploaded: [...documents]
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 5),
      knowledgeQualityScore: qualityScore,
    };
  }

  async getAnalytics() {
    const documents = await this.list({ includeDeleted: false });
    const collections = await this.listCollections();
    const tags = await this.listTags();
    const unused = documents.filter((item) => item.viewCount === 0 && item.aiUsageCount === 0);
    const stale = documents.filter((item) => {
      const updated = new Date(item.updatedAt || item.updatedDate || 0).getTime();
      return Number.isFinite(updated) && Date.now() - updated > 1000 * 60 * 60 * 24 * 90;
    });

    const tagStats = {};
    for (const document of documents) {
      for (const tag of document.tags || []) {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      }
    }

    return {
      mostViewed: [...documents].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10),
      mostRetrievedByAi: [...documents].sort((a, b) => b.aiUsageCount - a.aiUsageCount).slice(0, 10),
      unusedDocuments: unused.slice(0, 20),
      knowledgeFreshness: {
        fresh: documents.length - stale.length,
        stale: stale.length,
      },
      collectionsGrowth: collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        documents: documents.filter((item) => item.collectionId === collection.id).length,
      })),
      tagStatistics: Object.entries(tagStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      documentQuality: {
        average: documents.length
          ? Number(
              (
                documents.reduce((sum, item) => sum + Number(item.qualityScore || 0), 0) /
                documents.length
              ).toFixed(1)
            )
          : 0,
        incomplete: documents.filter((item) => (item.missingMetadata || []).length > 0).length,
      },
      reviewBacklog: documents.filter((item) => item.status === 'review').length,
      managedTags: tags.length,
    };
  }
}

export { computeCompleteness, computeQuality };
