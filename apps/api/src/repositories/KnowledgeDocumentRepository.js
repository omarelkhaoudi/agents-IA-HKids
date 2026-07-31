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

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  if (document.status === 'approved') score += 15;
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
      folderId: row.folder_id || null,
      aiVisibility: row.ai_visibility !== false,
      securityClassification: row.security_classification || 'internal',
      downloadCount: Number(row.download_count || 0),
      isFavorite: Boolean(row.is_favorite),
      mimeType: row.mime_type || '',
      checksum: row.checksum || '',
      byteSize: Number(row.byte_size || 0),
      storageKey: row.storage_key || '',
      processingStatus: row.processing_status || 'pending',
      processingError: row.processing_error || '',
      indexedAt: row.indexed_at || null,
      indexVersion: Number(row.index_version || 0),
      embeddingStatus: row.embedding_status || 'missing',
      embeddingProvider: row.embedding_provider || '',
      embeddingModel: row.embedding_model || '',
      chunkCount: Number(row.chunk_count || 0),
      averageChunkTokens: Number(row.average_chunk_tokens || 0),
      summary: row.summary || '',
      keywords: asJson(row.keywords, []),
      detectedLanguage: row.detected_language || '',
      contentHash: row.content_hash || '',
      duplicateOf: row.duplicate_of || null,
      lastIndexError: row.last_index_error || '',
      retrievalSuccessCount: Number(row.retrieval_success_count || 0),
      retrievalFailureCount: Number(row.retrieval_failure_count || 0),
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
    if (filters.folderId) {
      values.push(filters.folderId);
      clauses.push(`folder_id = $${values.length}`);
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
        : filters.sort === 'downloads'
          ? 'download_count DESC'
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
       WHERE deleted_at IS NULL AND status IN ('active', 'approved', 'review')
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
          quality_score, completeness_score, last_reviewed_by,
          folder_id, ai_visibility, security_classification, download_count, is_favorite,
          mime_type, checksum, byte_size, storage_key
        )
        VALUES (
          $1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,
          $30,$31,$32,$33,$34,$35,$36,$37,$38
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
        document.folderId || null,
        document.aiVisibility !== false,
        document.securityClassification || 'internal',
        document.downloadCount || 0,
        Boolean(document.isFavorite),
        document.mimeType || '',
        document.checksum || '',
        document.byteSize || 0,
        document.storageKey || '',
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
          folder_id = $31,
          ai_visibility = $32,
          security_classification = $33,
          download_count = $34,
          is_favorite = $35,
          mime_type = $36,
          checksum = $37,
          byte_size = $38,
          storage_key = $39,
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
        document.folderId || null,
        document.aiVisibility !== false,
        document.securityClassification || 'internal',
        document.downloadCount || 0,
        Boolean(document.isFavorite),
        document.mimeType || '',
        document.checksum || '',
        document.byteSize || 0,
        document.storageKey || '',
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

  mapFolder(row) {
    if (!row) return null;
    return {
      id: row.id,
      parentId: row.parent_id || null,
      name: row.name,
      description: row.description || '',
      owner: row.owner || '',
      status: row.status,
      isFavorite: Boolean(row.is_favorite),
      isPinned: Boolean(row.is_pinned),
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listFolders(filters = {}) {
    const clauses = [];
    const values = [];
    if (!filters.includeDeleted) {
      clauses.push(`status <> 'deleted'`);
    }
    if (filters.parentId === null) {
      clauses.push(`parent_id IS NULL`);
    } else if (filters.parentId) {
      values.push(filters.parentId);
      clauses.push(`parent_id = $${values.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM document_folders ${where} ORDER BY is_pinned DESC, sort_order ASC, name ASC`,
      values
    );
    return result.rows.map((row) => this.mapFolder(row));
  }

  async getFolderById(id) {
    const result = await this.pool.query('SELECT * FROM document_folders WHERE id = $1 LIMIT 1', [
      id,
    ]);
    return this.mapFolder(result.rows[0]);
  }

  async createFolder(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO document_folders (
        id, parent_id, name, description, owner, status, is_favorite, is_pinned, sort_order
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        payload.parentId || null,
        payload.name,
        payload.description || '',
        payload.owner || '',
        payload.status || 'active',
        Boolean(payload.isFavorite),
        Boolean(payload.isPinned),
        payload.sortOrder ?? 0,
      ]
    );
    return this.getFolderById(id);
  }

  async updateFolder(id, payload) {
    const existing = await this.getFolderById(id);
    if (!existing) return null;
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE document_folders SET
        parent_id=$2, name=$3, description=$4, owner=$5, status=$6,
        is_favorite=$7, is_pinned=$8, sort_order=$9, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.parentId || null,
        next.name,
        next.description || '',
        next.owner || '',
        next.status || 'active',
        Boolean(next.isFavorite),
        Boolean(next.isPinned),
        next.sortOrder ?? 0,
      ]
    );
    return this.getFolderById(id);
  }

  async getFolderBreadcrumb(folderId) {
    const crumbs = [];
    let currentId = folderId;
    const guard = new Set();
    while (currentId && !guard.has(currentId)) {
      guard.add(currentId);
      const folder = await this.getFolderById(currentId);
      if (!folder) break;
      crumbs.unshift(folder);
      currentId = folder.parentId;
    }
    return crumbs;
  }

  async createDocumentFile(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO knowledge_document_files (
        id, document_id, storage_key, original_name, mime_type, extension, byte_size,
        checksum, version, ocr_status, virus_scan_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        payload.documentId,
        payload.storageKey,
        payload.originalName || '',
        payload.mimeType || 'application/octet-stream',
        payload.extension || '',
        payload.byteSize || 0,
        payload.checksum || '',
        payload.version || 1,
        payload.ocrStatus || 'pending',
        payload.virusScanStatus || 'pending',
      ]
    );
    return this.listDocumentFiles(payload.documentId).then((items) =>
      items.find((item) => item.id === id)
    );
  }

  async listDocumentFiles(documentId) {
    const result = await this.pool.query(
      `SELECT * FROM knowledge_document_files WHERE document_id = $1 ORDER BY version DESC, created_at DESC`,
      [documentId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      storageKey: row.storage_key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      extension: row.extension,
      byteSize: Number(row.byte_size || 0),
      checksum: row.checksum,
      version: row.version,
      ocrStatus: row.ocr_status,
      virusScanStatus: row.virus_scan_status,
      createdAt: row.created_at,
    }));
  }

  async addDmsAudit(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO dms_audit_events (id, document_id, folder_id, event_type, actor, summary, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        id,
        payload.documentId || null,
        payload.folderId || null,
        payload.eventType,
        payload.actor || '',
        payload.summary || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return id;
  }

  async listDmsAudit(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.documentId) {
      values.push(filters.documentId);
      clauses.push(`document_id = $${values.length}`);
    }
    if (filters.folderId) {
      values.push(filters.folderId);
      clauses.push(`folder_id = $${values.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    values.push(Math.min(Number(filters.limit || 100), 500));
    const result = await this.pool.query(
      `SELECT * FROM dms_audit_events ${where} ORDER BY created_at DESC LIMIT $${values.length}`,
      values
    );
    return result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      folderId: row.folder_id,
      eventType: row.event_type,
      actor: row.actor,
      summary: row.summary,
      metadata: asJson(row.metadata, {}),
      createdAt: row.created_at,
    }));
  }

  async createUploadSession(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO dms_upload_sessions (
        id, filename, total_chunks, received_chunks, byte_size, checksum, status, actor, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [
        id,
        payload.filename || '',
        payload.totalChunks || 1,
        payload.receivedChunks || 0,
        payload.byteSize || 0,
        payload.checksum || '',
        payload.status || 'open',
        payload.actor || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return this.getUploadSession(id);
  }

  async getUploadSession(id) {
    const result = await this.pool.query('SELECT * FROM dms_upload_sessions WHERE id = $1 LIMIT 1', [
      id,
    ]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      filename: row.filename,
      totalChunks: row.total_chunks,
      receivedChunks: row.received_chunks,
      byteSize: Number(row.byte_size || 0),
      checksum: row.checksum,
      status: row.status,
      actor: row.actor,
      metadata: asJson(row.metadata, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateUploadSession(id, payload) {
    const existing = await this.getUploadSession(id);
    if (!existing) return null;
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE dms_upload_sessions SET
        filename=$2, total_chunks=$3, received_chunks=$4, byte_size=$5, checksum=$6,
        status=$7, metadata=$8::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.filename || '',
        next.totalChunks || 1,
        next.receivedChunks || 0,
        next.byteSize || 0,
        next.checksum || '',
        next.status || 'open',
        JSON.stringify(next.metadata || {}),
      ]
    );
    return this.getUploadSession(id);
  }

  async getDmsDashboardStats() {
    const documents = await this.list({ includeDeleted: false });
    const folders = await this.listFolders();
    const collections = await this.listCollections();
    const storageBytes = documents.reduce((sum, item) => sum + Number(item.byteSize || 0), 0);

    return {
      totalDocuments: documents.length,
      folders: folders.filter((item) => item.status === 'active').length,
      collections: collections.length,
      draft: documents.filter((item) => item.status === 'draft').length,
      review: documents.filter((item) => item.status === 'review').length,
      approved: documents.filter((item) => item.status === 'approved').length,
      published: documents.filter((item) => item.status === 'active').length,
      archived: documents.filter((item) => item.status === 'archived').length,
      storageUsageBytes: storageBytes,
      storageUsageLabel: `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`,
      recentlyUploaded: [...documents]
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 5),
      recentlyModified: [...documents]
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .slice(0, 5),
      mostViewed: [...documents].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
      mostDownloaded: [...documents].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 5),
      usedByAi: [...documents].sort((a, b) => b.aiUsageCount - a.aiUsageCount).slice(0, 5),
      pendingApprovals: documents.filter(
        (item) => item.status === 'review' || item.status === 'approved'
      ).length,
      documentQuality:
        documents.length > 0
          ? Number(
              (
                documents.reduce((sum, item) => sum + Number(item.qualityScore || 0), 0) /
                documents.length
              ).toFixed(1)
            )
          : 0,
    };
  }

  async getDmsAnalytics() {
    const documents = await this.list({ includeDeleted: false });
    const folders = await this.listFolders();
    const unused = documents.filter(
      (item) => item.viewCount === 0 && item.downloadCount === 0 && item.aiUsageCount === 0
    );
    const stale = documents.filter((item) => {
      const updated = new Date(item.updatedAt || item.updatedDate || 0).getTime();
      return Number.isFinite(updated) && Date.now() - updated > 1000 * 60 * 60 * 24 * 90;
    });
    const decided = documents.filter((item) => item.approvalCount + item.rejectionCount > 0);

    return {
      mostViewed: [...documents].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10),
      mostDownloaded: [...documents].sort((a, b) => b.downloadCount - a.downloadCount).slice(0, 10),
      mostUsedByAi: [...documents].sort((a, b) => b.aiUsageCount - a.aiUsageCount).slice(0, 10),
      unusedDocuments: unused.slice(0, 20),
      storageUsageBytes: documents.reduce((sum, item) => sum + Number(item.byteSize || 0), 0),
      growth: {
        total: documents.length,
        published: documents.filter((item) => item.status === 'active').length,
        draft: documents.filter((item) => item.status === 'draft').length,
      },
      reviewBacklog: documents.filter((item) => item.status === 'review').length,
      approvalRate: decided.length
        ? Number(
            (
              (decided.reduce((sum, item) => sum + item.approvalCount, 0) /
                decided.reduce((sum, item) => sum + item.approvalCount + item.rejectionCount, 0)) *
              100
            ).toFixed(1)
          )
        : 0,
      freshness: {
        fresh: documents.length - stale.length,
        stale: stale.length,
      },
      versionActivity: documents
        .map((item) => ({ id: item.id, title: item.title, version: item.version }))
        .sort((a, b) => b.version - a.version)
        .slice(0, 20),
      folderUsage: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        documents: documents.filter((item) => item.folderId === folder.id).length,
      })),
    };
  }

  mapVectorChunk(row) {
    if (!row) return null;
    return {
      id: row.id,
      documentId: row.document_id,
      chunkNumber: Number(row.chunk_number || 0),
      sectionTitle: row.section_title || '',
      content: row.content || '',
      contentHash: row.content_hash || '',
      tokenCount: Number(row.token_count || 0),
      estimatedTokens: Number(row.token_count || 0),
      charCount: Number(row.char_count || 0),
      keywords: asJson(row.keywords, []),
      language: row.language || '',
      summary: row.summary || '',
      aiVisibility: row.ai_visibility !== false,
      qualityScore: Number(row.quality_score || 0),
      freshnessScore: Number(row.freshness_score || 0),
      metadata: asJson(row.metadata, {}),
      status: row.status || 'pending',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  mapEmbedding(row) {
    if (!row) return null;
    return {
      chunkId: row.chunk_id,
      documentId: row.document_id,
      provider: row.provider,
      model: row.model,
      dimensions: Number(row.dimensions || 0),
      embedding: asJson(row.embedding, []),
      embeddingHash: row.embedding_hash || '',
      status: row.status || 'missing',
      latencyMs: Number(row.latency_ms || 0),
      errorMessage: row.error_message || '',
      metadata: asJson(row.metadata, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async replaceVectorChunks(documentId, chunks = []) {
    await this.pool.query('DELETE FROM knowledge_vector_chunks WHERE document_id = $1', [documentId]);

    for (const chunk of chunks) {
      await this.upsertVectorChunk(chunk);
    }

    return this.listVectorChunks({ documentId });
  }

  async upsertVectorChunk(chunk) {
    await this.pool.query(
      `
        INSERT INTO knowledge_vector_chunks (
          id, document_id, chunk_number, section_title, content, content_hash,
          token_count, char_count, keywords, language, summary, ai_visibility,
          quality_score, freshness_score, metadata, status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15::jsonb,$16)
        ON CONFLICT (id) DO UPDATE SET
          chunk_number = EXCLUDED.chunk_number,
          section_title = EXCLUDED.section_title,
          content = EXCLUDED.content,
          content_hash = EXCLUDED.content_hash,
          token_count = EXCLUDED.token_count,
          char_count = EXCLUDED.char_count,
          keywords = EXCLUDED.keywords,
          language = EXCLUDED.language,
          summary = EXCLUDED.summary,
          ai_visibility = EXCLUDED.ai_visibility,
          quality_score = EXCLUDED.quality_score,
          freshness_score = EXCLUDED.freshness_score,
          metadata = EXCLUDED.metadata,
          status = EXCLUDED.status,
          updated_at = NOW()
      `,
      [
        chunk.id,
        chunk.documentId,
        chunk.chunkNumber,
        chunk.sectionTitle || '',
        chunk.content || '',
        chunk.contentHash || '',
        chunk.tokenCount || chunk.estimatedTokens || 0,
        chunk.charCount || String(chunk.content || '').length,
        JSON.stringify(chunk.keywords || []),
        chunk.language || '',
        chunk.summary || '',
        chunk.aiVisibility !== false,
        chunk.qualityScore || 0,
        chunk.freshnessScore || 0,
        JSON.stringify(chunk.metadata || {}),
        chunk.status || 'indexed',
      ]
    );

    return this.getVectorChunk(chunk.id);
  }

  async getVectorChunk(id) {
    const result = await this.pool.query(
      'SELECT * FROM knowledge_vector_chunks WHERE id = $1 LIMIT 1',
      [id]
    );
    return this.mapVectorChunk(result.rows[0]);
  }

  async listVectorChunks({ documentId, status, limit = 2000 } = {}) {
    const clauses = [];
    const values = [];
    if (documentId) {
      values.push(documentId);
      clauses.push(`document_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      clauses.push(`status = $${values.length}`);
    }
    values.push(Math.min(Math.max(Number(limit) || 2000, 1), 10000));
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM knowledge_vector_chunks ${where} ORDER BY document_id ASC, chunk_number ASC LIMIT $${values.length}`,
      values
    );
    return result.rows.map((row) => this.mapVectorChunk(row));
  }

  async upsertEmbedding(record) {
    await this.pool.query(
      `
        INSERT INTO knowledge_vector_embeddings (
          chunk_id, document_id, provider, model, dimensions, embedding,
          embedding_hash, status, latency_ms, error_message, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11::jsonb)
        ON CONFLICT (chunk_id) DO UPDATE SET
          provider = EXCLUDED.provider,
          model = EXCLUDED.model,
          dimensions = EXCLUDED.dimensions,
          embedding = EXCLUDED.embedding,
          embedding_hash = EXCLUDED.embedding_hash,
          status = EXCLUDED.status,
          latency_ms = EXCLUDED.latency_ms,
          error_message = EXCLUDED.error_message,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [
        record.chunkId,
        record.documentId,
        record.provider || '',
        record.model || '',
        record.dimensions || 0,
        JSON.stringify(record.embedding || []),
        record.embeddingHash || '',
        record.status || 'ready',
        record.latencyMs || 0,
        record.errorMessage || '',
        JSON.stringify(record.metadata || {}),
      ]
    );

    return this.getEmbedding(record.chunkId);
  }

  async getEmbedding(chunkId) {
    const result = await this.pool.query(
      'SELECT * FROM knowledge_vector_embeddings WHERE chunk_id = $1 LIMIT 1',
      [chunkId]
    );
    return this.mapEmbedding(result.rows[0]);
  }

  async listVectorIndexItems({ provider, model, limit = 10000 } = {}) {
    const values = [];
    const filters = [`c.ai_visibility = TRUE`, `c.status = 'indexed'`, `e.status = 'ready'`];
    if (provider) {
      values.push(provider);
      filters.push(`e.provider = $${values.length}`);
    }
    if (model) {
      values.push(model);
      filters.push(`e.model = $${values.length}`);
    }
    values.push(Math.min(Math.max(Number(limit) || 10000, 1), 50000));
    const result = await this.pool.query(
      `
        SELECT
          c.*, e.provider, e.model, e.dimensions, e.embedding, e.embedding_hash,
          d.title, d.category, d.description, d.tags, d.status AS document_status,
          d.author, d.owner, d.collection_id, d.priority, d.updated_date, d.updated_at,
          d.ai_visibility, d.security_classification, d.quality_score
        FROM knowledge_vector_chunks c
        INNER JOIN knowledge_vector_embeddings e ON e.chunk_id = c.id
        INNER JOIN knowledge_documents d ON d.id = c.document_id
        WHERE ${filters.join(' AND ')}
          AND d.deleted_at IS NULL
          AND d.status IN ('active', 'approved', 'review')
          AND d.ai_visibility = TRUE
        ORDER BY c.updated_at DESC
        LIMIT $${values.length}
      `,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      embedding: asJson(row.embedding, []),
      provider: row.provider,
      model: row.model,
      dimensions: Number(row.dimensions || 0),
      embeddingHash: row.embedding_hash,
      tokens: Number(row.token_count || 0),
      content: row.content,
      chunkNumber: Number(row.chunk_number || 0),
      sectionTitle: row.section_title || '',
      keywords: asJson(row.keywords, []),
      metadata: {
        ...asJson(row.metadata, {}),
        title: row.title,
        category: row.category,
        description: row.description,
        tags: asJson(row.tags, []),
        author: row.author,
        owner: row.owner,
        collectionId: row.collection_id,
        status: row.document_status,
        priority: row.priority,
        updatedDate: row.updated_date,
        updatedAt: row.updated_at,
        securityClassification: row.security_classification,
        qualityScore: Number(row.quality_score || 0),
      },
    }));
  }

  async updateVectorDocumentState(documentId, payload = {}) {
    const existing = await this.getById(documentId);
    if (!existing) return null;
    await this.pool.query(
      `
        UPDATE knowledge_documents
        SET
          processing_status = $2,
          processing_error = $3,
          indexed_at = $4,
          index_version = $5,
          embedding_status = $6,
          embedding_provider = $7,
          embedding_model = $8,
          chunk_count = $9,
          average_chunk_tokens = $10,
          summary = $11,
          keywords = $12::jsonb,
          detected_language = $13,
          content_hash = $14,
          duplicate_of = $15,
          last_index_error = $16,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        documentId,
        payload.processingStatus || existing.processingStatus || 'pending',
        payload.processingError || '',
        payload.indexedAt || existing.indexedAt || null,
        payload.indexVersion ?? Number(existing.indexVersion || 0) + 1,
        payload.embeddingStatus || existing.embeddingStatus || 'missing',
        payload.embeddingProvider || existing.embeddingProvider || '',
        payload.embeddingModel || existing.embeddingModel || '',
        payload.chunkCount ?? existing.chunkCount ?? 0,
        payload.averageChunkTokens ?? existing.averageChunkTokens ?? 0,
        payload.summary || existing.summary || '',
        JSON.stringify(payload.keywords || existing.keywords || []),
        payload.detectedLanguage || existing.detectedLanguage || existing.language || '',
        payload.contentHash || existing.contentHash || '',
        payload.duplicateOf || null,
        payload.lastIndexError || '',
      ]
    );
    return this.getById(documentId);
  }

  async findDuplicateContent(contentHashValue, excludeDocumentId = '') {
    if (!contentHashValue) return null;
    const values = [contentHashValue];
    let extra = '';
    if (excludeDocumentId) {
      values.push(excludeDocumentId);
      extra = `AND id <> $${values.length}`;
    }
    const result = await this.pool.query(
      `SELECT id, title, version FROM knowledge_documents
       WHERE content_hash = $1 ${extra}
       AND deleted_at IS NULL AND status <> 'deleted'
       ORDER BY updated_at DESC LIMIT 1`,
      values
    );
    return result.rows[0] || null;
  }

  mapIndexJob(row) {
    if (!row) return null;
    return {
      id: row.id,
      scope: row.scope,
      targetId: row.target_id || null,
      status: row.status,
      priority: Number(row.priority || 0),
      provider: row.provider || '',
      model: row.model || '',
      totalDocuments: Number(row.total_documents || 0),
      totalChunks: Number(row.total_chunks || 0),
      processedDocuments: Number(row.processed_documents || 0),
      processedChunks: Number(row.processed_chunks || 0),
      failedDocuments: Number(row.failed_documents || 0),
      failedChunks: Number(row.failed_chunks || 0),
      errorMessage: row.error_message || '',
      actor: row.actor || '',
      metadata: asJson(row.metadata, {}),
      startedAt: row.started_at || null,
      finishedAt: row.finished_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createIndexJob(payload = {}) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `
        INSERT INTO knowledge_index_jobs (
          id, scope, target_id, status, priority, provider, model, actor, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
      `,
      [
        id,
        payload.scope || 'all',
        payload.targetId || null,
        payload.status || 'queued',
        payload.priority || 0,
        payload.provider || '',
        payload.model || '',
        payload.actor || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return this.getIndexJob(id);
  }

  async getIndexJob(id) {
    const result = await this.pool.query('SELECT * FROM knowledge_index_jobs WHERE id = $1', [id]);
    return this.mapIndexJob(result.rows[0]);
  }

  async updateIndexJob(id, payload = {}) {
    const existing = await this.getIndexJob(id);
    if (!existing) return null;
    const next = { ...existing, ...payload };
    await this.pool.query(
      `
        UPDATE knowledge_index_jobs SET
          status=$2, total_documents=$3, total_chunks=$4, processed_documents=$5,
          processed_chunks=$6, failed_documents=$7, failed_chunks=$8, error_message=$9,
          metadata=$10::jsonb, started_at=$11, finished_at=$12, updated_at=NOW()
        WHERE id=$1
      `,
      [
        id,
        next.status || 'queued',
        next.totalDocuments || 0,
        next.totalChunks || 0,
        next.processedDocuments || 0,
        next.processedChunks || 0,
        next.failedDocuments || 0,
        next.failedChunks || 0,
        next.errorMessage || '',
        JSON.stringify(next.metadata || {}),
        next.startedAt || null,
        next.finishedAt || null,
      ]
    );
    return this.getIndexJob(id);
  }

  async cancelIndexJob(id, actor = '') {
    const job = await this.updateIndexJob(id, {
      status: 'cancelled',
      finishedAt: new Date(),
      metadata: { cancelledBy: actor },
    });
    return job;
  }

  async listIndexJobs({ status, limit = 50 } = {}) {
    const values = [];
    const filters = [];
    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }
    values.push(Math.min(Math.max(Number(limit) || 50, 1), 200));
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM knowledge_index_jobs ${where} ORDER BY created_at DESC LIMIT $${values.length}`,
      values
    );
    return result.rows.map((row) => this.mapIndexJob(row));
  }

  async recordRetrievalEvent(payload = {}) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `
        INSERT INTO knowledge_retrieval_events (
          id, question_hash, agent_code, prompt_id, provider, model, cache_hit, status,
          top_k, retrieved_chunk_count, semantic_top_score, latency_ms, error_message, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
      `,
      [
        id,
        payload.questionHash || '',
        payload.agentCode || '',
        payload.promptId || null,
        payload.provider || '',
        payload.model || '',
        Boolean(payload.cacheHit),
        payload.status || 'success',
        payload.topK || 0,
        payload.retrievedChunkCount || 0,
        toNumber(payload.semanticTopScore),
        Math.round(toNumber(payload.latencyMs)),
        payload.errorMessage || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return id;
  }

  async getVectorStats({ staleDays = 90 } = {}) {
    const staleBefore = new Date(Date.now() - Math.max(Number(staleDays) || 90, 1) * 86400000);
    const [
      documentTotals,
      chunkTotals,
      embeddingTotals,
      missingEmbeddings,
      failedIndexing,
      duplicateTotals,
      staleKnowledge,
      recentRetrieval,
      jobs,
    ] = await Promise.all([
      this.pool.query(
        `SELECT COUNT(*)::int AS documents FROM knowledge_documents WHERE deleted_at IS NULL AND status <> 'deleted'`
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS chunks, COALESCE(AVG(token_count), 0) AS average_tokens
         FROM knowledge_vector_chunks`
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS embeddings, COALESCE(AVG(latency_ms), 0) AS embedding_latency_ms
         FROM knowledge_vector_embeddings WHERE status = 'ready'`
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS missing FROM knowledge_vector_chunks c
         LEFT JOIN knowledge_vector_embeddings e ON e.chunk_id = c.id AND e.status = 'ready'
         WHERE e.chunk_id IS NULL`
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS failed FROM knowledge_documents
         WHERE processing_status = 'failed' OR embedding_status = 'failed'`
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS duplicates FROM knowledge_documents
         WHERE duplicate_of IS NOT NULL AND deleted_at IS NULL AND status <> 'deleted'`
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS stale FROM knowledge_documents
         WHERE updated_at < $1 AND deleted_at IS NULL AND status <> 'deleted'`,
        [staleBefore]
      ),
      this.pool.query(
        `SELECT *
         FROM knowledge_retrieval_events
         ORDER BY created_at DESC
         LIMIT 200`
      ),
      this.pool.query(
        `SELECT status, COUNT(*)::int AS total FROM knowledge_index_jobs GROUP BY status`
      ),
    ]);

    const retrievalRows = recentRetrieval.rows;
    const success = retrievalRows.filter((row) => row.status === 'success').length;
    const failures = retrievalRows.filter((row) => row.status === 'failed').length;
    const cacheHits = retrievalRows.filter((row) => row.cache_hit).length;
    const latest = retrievalRows[0] || {};

    return {
      documentsIndexed: Number(documentTotals.rows[0]?.documents || 0),
      chunks: Number(chunkTotals.rows[0]?.chunks || 0),
      embeddings: Number(embeddingTotals.rows[0]?.embeddings || 0),
      averageChunkSize: Number(Number(chunkTotals.rows[0]?.average_tokens || 0).toFixed(1)),
      coverage: Number(
        chunkTotals.rows[0]?.chunks
          ? (
              (Number(embeddingTotals.rows[0]?.embeddings || 0) /
                Number(chunkTotals.rows[0]?.chunks || 1)) *
              100
            ).toFixed(1)
          : 0
      ),
      missingEmbeddings: Number(missingEmbeddings.rows[0]?.missing || 0),
      failedIndexing: Number(failedIndexing.rows[0]?.failed || 0),
      duplicates: Number(duplicateTotals.rows[0]?.duplicates || 0),
      staleKnowledge: Number(staleKnowledge.rows[0]?.stale || 0),
      retrievalLatency: retrievalRows.length
        ? Math.round(
            retrievalRows.reduce((sum, row) => sum + Number(row.latency_ms || 0), 0) /
              retrievalRows.length
          )
        : 0,
      retrievalSuccess: retrievalRows.length
        ? Number(((success / retrievalRows.length) * 100).toFixed(1))
        : 0,
      retrievalFailures: failures,
      cacheHitRatio: retrievalRows.length
        ? Number(((cacheHits / retrievalRows.length) * 100).toFixed(1))
        : 0,
      embeddingLatency: Math.round(Number(embeddingTotals.rows[0]?.embedding_latency_ms || 0)),
      queueSize: jobs.rows
        .filter((row) => ['queued', 'running'].includes(row.status))
        .reduce((sum, row) => sum + Number(row.total || 0), 0),
      jobs: jobs.rows.reduce((acc, row) => {
        acc[row.status] = Number(row.total || 0);
        return acc;
      }, {}),
      latestRetrieval: latest.id
        ? {
            at: latest.created_at,
            agentCode: latest.agent_code,
            topK: latest.top_k,
            chunks: latest.retrieved_chunk_count,
            semanticTopScore: Number(latest.semantic_top_score || 0),
            status: latest.status,
          }
        : null,
    };
  }
}

export { computeCompleteness, computeQuality };
