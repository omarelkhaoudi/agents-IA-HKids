import { randomUUID } from 'node:crypto';
import { defaultKnowledgeCollections } from '../../data/default-knowledge-collections.js';
import { KnowledgeDocumentRepository } from '../../repositories/KnowledgeDocumentRepository.js';

function getDisplayDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

function buildDocumentContent(document) {
  return `
${document.title}

${document.description || ''}

Category: ${document.category || ''}
Tags: ${(document.tags || []).join(', ')}
Author: ${document.author || document.owner || ''}
Type: ${document.fileType || 'PDF'}
Language: ${document.language || 'fr'}
Notes: ${document.notes || ''}
`.trim();
}

export class KnowledgePlatformService {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.documentRepository =
      options.documentRepository || new KnowledgeDocumentRepository(pool);
    this.refreshCaches = options.refreshCaches || (async () => {});
    this.scheduleRefreshIndex = options.scheduleRefreshIndex || (() => {});
  }

  async seedCollectionsIfEmpty() {
    const existing = await this.documentRepository.listCollections();
    if (existing.length > 0) {
      return existing;
    }

    for (const collection of defaultKnowledgeCollections) {
      await this.documentRepository.createCollection(collection);
    }

    return this.documentRepository.listCollections();
  }

  async syncDocumentTags(document) {
    for (const tag of document.tags || []) {
      if (!tag) continue;
      await this.documentRepository.upsertTag({ name: tag });
    }
  }

  async getBootstrap() {
    await this.seedCollectionsIfEmpty();
    const [documents, collections, tags, dashboard, analytics] = await Promise.all([
      this.documentRepository.list({ limit: 500 }),
      this.documentRepository.listCollections(),
      this.documentRepository.listTags(),
      this.documentRepository.getDashboardStats(),
      this.documentRepository.getAnalytics(),
    ]);

    return {
      documents,
      collections,
      tags,
      dashboard,
      analytics,
      reviewQueue: documents.filter((item) => item.status === 'review'),
    };
  }

  async getDashboard() {
    await this.seedCollectionsIfEmpty();
    return this.documentRepository.getDashboardStats();
  }

  async getAnalytics() {
    return this.documentRepository.getAnalytics();
  }

  async search(filters = {}) {
    const items = await this.documentRepository.list({
      search: filters.search || filters.q,
      status: filters.status,
      category: filters.category,
      collectionId: filters.collectionId,
      owner: filters.owner,
      language: filters.language,
      tag: filters.tag,
      sort: filters.sort,
      limit: filters.limit,
      offset: filters.offset,
    });

    let filtered = items;
    if (filters.priority != null && filters.priority !== '') {
      filtered = filtered.filter((item) => Number(item.priority) === Number(filters.priority));
    }
    if (filters.version != null && filters.version !== '') {
      filtered = filtered.filter((item) => Number(item.version) === Number(filters.version));
    }
    if (filters.fileType) {
      filtered = filtered.filter((item) => item.fileType === filters.fileType);
    }
    if (filters.agent) {
      const links = await Promise.all(
        filtered.map(async (document) => ({
          document,
          links: await this.documentRepository.listLinks(document.id),
        }))
      );
      filtered = links
        .filter(({ links: documentLinks }) =>
          documentLinks.some(
            (link) =>
              link.linkedType === 'agent' &&
              String(link.linkedId).toLowerCase().includes(String(filters.agent).toLowerCase())
          )
        )
        .map(({ document }) => document);
    }

    return { items: filtered, total: filtered.length };
  }

  listCollections() {
    return this.documentRepository.listCollections();
  }

  createCollection(payload) {
    return this.documentRepository.createCollection(payload);
  }

  updateCollection(id, payload) {
    return this.documentRepository.updateCollection(id, payload);
  }

  async getDocumentDetail(id) {
    const document = await this.documentRepository.getById(id);
    if (!document || document.status === 'deleted') {
      return null;
    }

    const [versions, links, events] = await Promise.all([
      this.documentRepository.listVersions(id),
      this.documentRepository.listLinks(id),
      this.documentRepository.listEvents(id),
    ]);

    await this.documentRepository.update(id, {
      ...document,
      viewCount: Number(document.viewCount || 0) + 1,
    });

    return {
      document: await this.documentRepository.getById(id),
      versions,
      links,
      events,
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

  async createDocument(payload, actor = '') {
    const timestamp = getDisplayDate();
    const document = await this.documentRepository.create({
      id: payload.id || `doc-${Date.now()}`,
      ...payload,
      tags: payload.tags || [],
      content: payload.content || buildDocumentContent({ ...payload, tags: payload.tags || [] }),
      priority: payload.priority ?? (payload.status === 'active' ? 2 : 1),
      createdDate: payload.createdDate || timestamp,
      updatedDate: payload.updatedDate || timestamp,
      status: payload.status || 'draft',
      version: 1,
    });

    await this.documentRepository.createVersion(document, 'Initial version', actor || document.author);
    await this.documentRepository.addEvent({
      documentId: document.id,
      eventType: 'created',
      actor: actor || document.author || document.owner,
      summary: 'Document created',
    });
    await this.syncDocumentTags(document);
    await this.refreshCaches();
    this.scheduleRefreshIndex();
    return document;
  }

  async updateDocument(documentId, payload, actor = '', options = {}) {
    const existing = await this.documentRepository.getById(documentId);
    if (!existing || existing.status === 'deleted') {
      return null;
    }

    const bumpVersion = options.bumpVersion !== false;
    const nextVersion = bumpVersion ? Number(existing.version || 1) + 1 : Number(existing.version || 1);

    const merged = {
      ...existing,
      ...payload,
      tags: payload.tags || existing.tags,
      updatedDate: getDisplayDate(),
      version: nextVersion,
      content:
        payload.content ||
        buildDocumentContent({
          ...existing,
          ...payload,
          tags: payload.tags || existing.tags,
        }),
      priority:
        payload.priority ??
        ((payload.status || existing.status) === 'active'
          ? Math.max(existing.priority || 1, 2)
          : existing.priority),
    };

    const updated = await this.documentRepository.update(documentId, merged);

    if (bumpVersion) {
      await this.documentRepository.createVersion(
        updated,
        options.changeSummary || 'Document updated',
        actor || updated.author || updated.owner
      );
    }

    await this.documentRepository.addEvent({
      documentId,
      eventType: 'updated',
      actor: actor || updated.author || updated.owner,
      summary: options.changeSummary || 'Document metadata updated',
      metadata: { version: updated.version },
    });
    await this.syncDocumentTags(updated);
    await this.refreshCaches();
    this.scheduleRefreshIndex();
    return updated;
  }

  async removeDocument(documentId, actor = '') {
    const existing = await this.documentRepository.getById(documentId);
    if (!existing) return false;

    const deleted = await this.documentRepository.remove(documentId);
    if (deleted) {
      await this.documentRepository.addEvent({
        documentId,
        eventType: 'deleted',
        actor,
        summary: 'Document soft-deleted',
      });
      await this.refreshCaches();
      this.scheduleRefreshIndex();
    }
    return deleted;
  }

  async transitionStatus(documentId, nextStatus, actor = '', summary = '') {
    const existing = await this.documentRepository.getById(documentId);
    if (!existing || existing.status === 'deleted') {
      return null;
    }

    const allowed = {
      draft: ['review', 'archived', 'deleted'],
      review: ['draft', 'active', 'archived', 'deleted'],
      active: ['review', 'archived', 'deleted'],
      archived: ['draft', 'active', 'deleted'],
      deleted: [],
    };

    if (!(allowed[existing.status] || []).includes(nextStatus)) {
      const error = new Error(`Cannot transition from ${existing.status} to ${nextStatus}`);
      error.statusCode = 400;
      throw error;
    }

    const patch = {
      status: nextStatus,
    };

    if (nextStatus === 'active') {
      patch.approvalCount = Number(existing.approvalCount || 0) + 1;
      patch.lastReviewedAt = new Date().toISOString();
      patch.lastReviewedBy = actor;
    }

    if (nextStatus === 'draft' && existing.status === 'review') {
      patch.rejectionCount = Number(existing.rejectionCount || 0) + 1;
    }

    if (nextStatus === 'review') {
      patch.reviewDate = getDisplayDate();
    }

    const updated = await this.updateDocument(documentId, patch, actor, {
      changeSummary: summary || `Status changed to ${nextStatus}`,
    });

    await this.documentRepository.addEvent({
      documentId,
      eventType: `status_${nextStatus}`,
      actor,
      summary: summary || `Moved to ${nextStatus}`,
      metadata: { from: existing.status, to: nextStatus },
    });

    return updated;
  }

  submitForReview(documentId, actor = '', comment = '') {
    return this.transitionStatus(documentId, 'review', actor, comment || 'Submitted for review');
  }

  publishDocument(documentId, actor = '', comment = '') {
    return this.transitionStatus(documentId, 'active', actor, comment || 'Published');
  }

  requestCorrections(documentId, actor = '', comment = '') {
    return this.transitionStatus(documentId, 'draft', actor, comment || 'Corrections requested');
  }

  archiveDocument(documentId, actor = '', comment = '') {
    return this.transitionStatus(documentId, 'archived', actor, comment || 'Archived');
  }

  listVersions(documentId) {
    return this.documentRepository.listVersions(documentId);
  }

  async compareVersions(documentId, leftVersion, rightVersion) {
    const [left, right] = await Promise.all([
      this.documentRepository.getVersion(documentId, Number(leftVersion)),
      this.documentRepository.getVersion(documentId, Number(rightVersion)),
    ]);

    if (!left || !right) {
      return null;
    }

    return {
      left,
      right,
      differences: {
        title: left.title !== right.title,
        description: left.description !== right.description,
        content: left.content !== right.content,
        tags: JSON.stringify(left.tags) !== JSON.stringify(right.tags),
      },
    };
  }

  async restoreVersion(documentId, version, actor = '') {
    const snapshot = await this.documentRepository.getVersion(documentId, Number(version));
    if (!snapshot) {
      return null;
    }

    const source = snapshot.snapshot?.id
      ? snapshot.snapshot
      : {
          title: snapshot.title,
          description: snapshot.description,
          content: snapshot.content,
          tags: snapshot.tags,
        };

    return this.updateDocument(
      documentId,
      {
        title: source.title,
        description: source.description,
        content: source.content,
        tags: source.tags || [],
        category: source.category,
        status: source.status,
        author: source.author,
        owner: source.owner,
        language: source.language,
        notes: source.notes,
        collectionId: source.collectionId,
        fileType: source.fileType,
        size: source.size,
        sourceFileName: source.sourceFileName,
        priority: source.priority,
      },
      actor,
      { changeSummary: `Restored version ${version}` }
    );
  }

  async duplicateVersion(documentId, version, actor = '') {
    const snapshot = await this.documentRepository.getVersion(documentId, Number(version));
    const existing = await this.documentRepository.getById(documentId);
    if (!snapshot || !existing) {
      return null;
    }

    const source = snapshot.snapshot?.title ? snapshot.snapshot : snapshot;
    return this.createDocument(
      {
        ...existing,
        ...source,
        id: `doc-${Date.now()}-${randomUUID().slice(0, 8)}`,
        title: `${source.title || existing.title} (copy v${version})`,
        status: 'draft',
        version: 1,
      },
      actor
    );
  }

  listLinks(documentId) {
    return this.documentRepository.listLinks(documentId);
  }

  async addLink(payload, actor = '') {
    const link = await this.documentRepository.addLink(payload);
    await this.documentRepository.addEvent({
      documentId: payload.documentId,
      eventType: 'link_added',
      actor,
      summary: `Linked ${payload.linkedType}:${payload.linkedId}`,
      metadata: payload,
    });
    return link;
  }

  async removeLink(linkId, documentId, actor = '') {
    const removed = await this.documentRepository.removeLink(linkId);
    if (removed && documentId) {
      await this.documentRepository.addEvent({
        documentId,
        eventType: 'link_removed',
        actor,
        summary: `Removed link ${linkId}`,
      });
    }
    return removed;
  }

  listTags() {
    return this.documentRepository.listTags();
  }

  upsertTag(payload) {
    return this.documentRepository.upsertTag(payload);
  }

  async mergeTags(sourceName, targetName, actor = '') {
    const result = await this.documentRepository.mergeTags(sourceName, targetName);
    await this.refreshCaches();
    this.scheduleRefreshIndex();
    return { tag: result, actor };
  }

  async bulkAction(action, documentIds = [], payload = {}, actor = '') {
    const results = [];
    for (const documentId of documentIds) {
      if (action === 'archive') {
        results.push(await this.archiveDocument(documentId, actor));
      } else if (action === 'delete') {
        results.push(await this.removeDocument(documentId, actor));
      } else if (action === 'move') {
        results.push(
          await this.updateDocument(documentId, { collectionId: payload.collectionId }, actor, {
            changeSummary: 'Moved to collection',
          })
        );
      } else if (action === 'tag') {
        const existing = await this.documentRepository.getById(documentId);
        if (!existing) continue;
        const nextTags = Array.from(new Set([...(existing.tags || []), ...(payload.tags || [])]));
        results.push(
          await this.updateDocument(documentId, { tags: nextTags }, actor, {
            changeSummary: 'Bulk tags applied',
          })
        );
      } else if (action === 'duplicate') {
        const existing = await this.documentRepository.getById(documentId);
        if (!existing) continue;
        results.push(
          await this.createDocument(
            {
              ...existing,
              id: `doc-${Date.now()}-${randomUUID().slice(0, 8)}`,
              title: `${existing.title} (copy)`,
              status: 'draft',
            },
            actor
          )
        );
      } else if (action === 'merge') {
        // Keep first document, soft-delete the rest after tagging notes.
        if (documentIds[0] !== documentId) {
          const primary = await this.documentRepository.getById(documentIds[0]);
          const current = await this.documentRepository.getById(documentId);
          if (primary && current) {
            await this.updateDocument(
              primary.id,
              {
                notes: `${primary.notes || ''}\nMerged from ${current.title} (${current.id})`.trim(),
                tags: Array.from(new Set([...(primary.tags || []), ...(current.tags || [])])),
              },
              actor,
              { changeSummary: `Merged ${current.id}` }
            );
            results.push(await this.removeDocument(documentId, actor));
          }
        }
      }
    }

    return { action, count: results.filter(Boolean).length, results };
  }

  async exportMetadata(filters = {}) {
    const { items } = await this.search(filters);
    return {
      exportedAt: new Date().toISOString(),
      count: items.length,
      items: items.map((document) => ({
        id: document.id,
        title: document.title,
        description: document.description,
        category: document.category,
        collectionId: document.collectionId,
        tags: document.tags,
        owner: document.owner,
        author: document.author,
        language: document.language,
        status: document.status,
        priority: document.priority,
        version: document.version,
        reviewDate: document.reviewDate,
        expirationDate: document.expirationDate,
        notes: document.notes,
        qualityScore: document.qualityScore,
        completenessScore: document.completenessScore,
      })),
    };
  }

  async importMetadata(items = [], actor = '') {
    const imported = [];
    for (const item of items) {
      if (!item?.title || !item?.category) continue;
      const existing = item.id ? await this.documentRepository.getById(item.id) : null;
      if (existing) {
        imported.push(
          await this.updateDocument(
            existing.id,
            {
              title: item.title,
              description: item.description || existing.description,
              category: item.category,
              collectionId: item.collectionId ?? existing.collectionId,
              tags: item.tags || existing.tags,
              owner: item.owner || existing.owner,
              author: item.author || existing.author,
              language: item.language || existing.language,
              status: item.status || existing.status,
              priority: item.priority ?? existing.priority,
              reviewDate: item.reviewDate || existing.reviewDate,
              expirationDate: item.expirationDate || existing.expirationDate,
              notes: item.notes || existing.notes,
            },
            actor,
            { changeSummary: 'Metadata imported' }
          )
        );
      } else {
        imported.push(
          await this.createDocument(
            {
              ...item,
              status: item.status || 'draft',
              fileType: item.fileType || 'TXT',
              size: item.size || '0.0 MB',
              sourceFileName: item.sourceFileName || '',
            },
            actor
          )
        );
      }
    }

    return { imported: imported.length, items: imported };
  }

  async recordAiUsage(documentIds = []) {
    for (const documentId of documentIds) {
      const document = await this.documentRepository.getById(documentId);
      if (!document) continue;
      await this.documentRepository.update(documentId, {
        ...document,
        aiUsageCount: Number(document.aiUsageCount || 0) + 1,
      });
    }
  }
}
