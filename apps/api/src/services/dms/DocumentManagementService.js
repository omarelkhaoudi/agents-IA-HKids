import { createHash, randomUUID } from 'node:crypto';
import {
  defaultDocumentFolders,
  SUPPORTED_DMS_EXTENSIONS,
  SUPPORTED_DMS_MIME_TYPES,
} from '../../data/default-document-folders.js';
import { KnowledgeDocumentRepository } from '../../repositories/KnowledgeDocumentRepository.js';
import { createDmsInfrastructure, newUploadSessionId } from './DmsInfrastructure.js';

function getDisplayDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

function extensionFromName(filename = '') {
  const parts = String(filename).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function fileTypeFromExtension(extension) {
  const map = {
    pdf: 'PDF',
    docx: 'DOCX',
    xlsx: 'XLSX',
    pptx: 'PPTX',
    txt: 'TXT',
    md: 'MD',
    html: 'HTML',
    csv: 'CSV',
    png: 'PNG',
    jpeg: 'JPEG',
    jpg: 'JPEG',
    svg: 'SVG',
    zip: 'ZIP',
  };
  return map[extension] || extension.toUpperCase() || 'BIN';
}

function buildSyntheticContent(document, extractedText = '') {
  return `
${document.title}

${document.description || ''}

Category: ${document.category || ''}
Tags: ${(document.tags || []).join(', ')}
Author: ${document.author || document.owner || ''}
Type: ${document.fileType || ''}
Classification: ${document.securityClassification || 'internal'}

${extractedText}
`.trim();
}

export class DocumentManagementService {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.documentRepository =
      options.documentRepository || new KnowledgeDocumentRepository(pool);
    this.knowledgePlatform = options.knowledgePlatform || null;
    this.refreshCaches = options.refreshCaches || (async () => {});
    this.scheduleRefreshIndex = options.scheduleRefreshIndex || (() => {});
    this.documentAclService = options.documentAclService || null;
    this.workflowEngine = options.workflowEngine || null;
    const infra = createDmsInfrastructure(options.infrastructure || {});
    this.storage = infra.storage;
    this.ocr = infra.ocr;
    this.virusScan = infra.virusScan;
    this.maxUploadBytes = infra.maxUploadBytes;
  }

  async ensureDocumentAccess(document, action, context = {}) {
    if (!document || !this.documentAclService || !context.user) {
      return;
    }

    await this.documentAclService.ensureAccess({
      user: context.user,
      tenant: context.tenant,
      document,
      action,
    });
  }

  async seedFoldersIfEmpty() {
    const existing = await this.documentRepository.listFolders({ includeDeleted: true });
    if (existing.length > 0) return existing;
    for (const folder of defaultDocumentFolders) {
      await this.documentRepository.createFolder(folder);
    }
    return this.documentRepository.listFolders();
  }

  async getBootstrap() {
    await this.seedFoldersIfEmpty();
    const [documents, folders, collections, dashboard, analytics, audit] = await Promise.all([
      this.documentRepository.list({ limit: 500 }),
      this.documentRepository.listFolders(),
      this.documentRepository.listCollections(),
      this.documentRepository.getDmsDashboardStats(),
      this.documentRepository.getDmsAnalytics(),
      this.documentRepository.listDmsAudit({ limit: 30 }),
    ]);

    return {
      documents,
      folders,
      collections,
      dashboard,
      analytics,
      audit,
      supportedExtensions: SUPPORTED_DMS_EXTENSIONS,
      reviewQueue: documents.filter(
        (item) => item.status === 'review' || item.status === 'approved'
      ),
    };
  }

  getDashboard() {
    return this.documentRepository.getDmsDashboardStats();
  }

  getAnalytics() {
    return this.documentRepository.getDmsAnalytics();
  }

  async search(filters = {}) {
    const result = this.knowledgePlatform
      ? await this.knowledgePlatform.search(filters)
      : {
          items: await this.documentRepository.list({
            search: filters.search || filters.q,
            status: filters.status,
            category: filters.category,
            collectionId: filters.collectionId,
            folderId: filters.folderId,
            owner: filters.owner,
            language: filters.language,
            tag: filters.tag,
            sort: filters.sort,
            limit: filters.limit,
            offset: filters.offset,
          }),
        };

    let items = result.items || [];
    if (filters.folderId) {
      items = items.filter((item) => item.folderId === filters.folderId);
    }
    if (filters.securityClassification) {
      items = items.filter(
        (item) => item.securityClassification === filters.securityClassification
      );
    }
    if (filters.aiVisibility != null && filters.aiVisibility !== '') {
      const visible = String(filters.aiVisibility) === 'true';
      items = items.filter((item) => Boolean(item.aiVisibility) === visible);
    }
    return { items, total: items.length };
  }

  listFolders(filters) {
    return this.documentRepository.listFolders(filters);
  }

  async createFolder(payload, actor = '') {
    const folder = await this.documentRepository.createFolder(payload);
    await this.documentRepository.addDmsAudit({
      folderId: folder.id,
      eventType: 'folder_created',
      actor,
      summary: `Created folder ${folder.name}`,
    });
    return folder;
  }

  async updateFolder(id, payload, actor = '') {
    const folder = await this.documentRepository.updateFolder(id, payload);
    if (!folder) return null;
    await this.documentRepository.addDmsAudit({
      folderId: id,
      eventType: 'folder_updated',
      actor,
      summary: `Updated folder ${folder.name}`,
      metadata: payload,
    });
    return folder;
  }

  async renameFolder(id, name, actor = '') {
    return this.updateFolder(id, { name }, actor);
  }

  async moveFolder(id, parentId, actor = '') {
    if (parentId === id) {
      const error = new Error('A folder cannot be moved into itself.');
      error.statusCode = 400;
      throw error;
    }
    return this.updateFolder(id, { parentId: parentId || null }, actor);
  }

  async archiveFolder(id, actor = '') {
    return this.updateFolder(id, { status: 'archived' }, actor);
  }

  async restoreFolder(id, actor = '') {
    return this.updateFolder(id, { status: 'active' }, actor);
  }

  async deleteFolder(id, actor = '') {
    const folder = await this.updateFolder(id, { status: 'deleted' }, actor);
    await this.documentRepository.addDmsAudit({
      folderId: id,
      eventType: 'folder_deleted',
      actor,
      summary: `Deleted folder ${id}`,
    });
    return folder;
  }

  async copyFolder(id, actor = '') {
    const source = await this.documentRepository.getFolderById(id);
    if (!source) return null;
    const copy = await this.createFolder(
      {
        ...source,
        id: undefined,
        name: `${source.name} (copy)`,
        isPinned: false,
      },
      actor
    );
    return copy;
  }

  getFolderBreadcrumb(folderId) {
    return this.documentRepository.getFolderBreadcrumb(folderId);
  }

  validateUpload({ filename, byteSize, mimeType }) {
    const extension = extensionFromName(filename);
    const errors = [];
    if (!SUPPORTED_DMS_EXTENSIONS.includes(extension)) {
      errors.push(`Unsupported extension: ${extension || '(none)'}`);
    }
    if (byteSize > this.maxUploadBytes) {
      errors.push(`File exceeds size limit of ${this.maxUploadBytes} bytes`);
    }
    const expectedMime = SUPPORTED_DMS_MIME_TYPES[extension];
    if (mimeType && expectedMime && mimeType !== expectedMime && !mimeType.startsWith('text/')) {
      // Soft warning only for mime mismatch — some browsers send generic types.
    }
    return {
      valid: errors.length === 0,
      errors,
      extension,
      expectedMime: expectedMime || mimeType || 'application/octet-stream',
    };
  }

  async startUploadSession(payload, actor = '') {
    const validation = this.validateUpload({
      filename: payload.filename,
      byteSize: payload.byteSize || 0,
      mimeType: payload.mimeType,
    });
    if (!validation.valid) {
      const error = new Error(validation.errors.join('; '));
      error.statusCode = 400;
      throw error;
    }

    return this.documentRepository.createUploadSession({
      id: newUploadSessionId(),
      filename: payload.filename,
      totalChunks: payload.totalChunks || 1,
      byteSize: payload.byteSize || 0,
      actor,
      metadata: {
        mimeType: payload.mimeType || validation.expectedMime,
        folderId: payload.folderId || null,
        collectionId: payload.collectionId || null,
        overwriteDocumentId: payload.overwriteDocumentId || null,
      },
    });
  }

  async cancelUploadSession(sessionId, actor = '') {
    const session = await this.documentRepository.updateUploadSession(sessionId, {
      status: 'cancelled',
    });
    await this.documentRepository.addDmsAudit({
      eventType: 'upload_cancelled',
      actor,
      summary: `Cancelled upload session ${sessionId}`,
    });
    return session;
  }

  async receiveUploadChunk(sessionId, payload = {}) {
    const session = await this.documentRepository.getUploadSession(sessionId);
    if (!session || session.status !== 'open') {
      const error = new Error('Upload session is not open');
      error.statusCode = 400;
      throw error;
    }
    const receivedChunks = Number(session.receivedChunks || 0) + 1;
    const metadata = {
      ...session.metadata,
      chunks: [...(session.metadata.chunks || []), payload.chunkIndex ?? receivedChunks - 1],
    };
    const completed = receivedChunks >= Number(session.totalChunks || 1);
    return this.documentRepository.updateUploadSession(sessionId, {
      receivedChunks,
      metadata,
      status: completed ? 'completed' : 'open',
      checksum: payload.checksum || session.checksum,
    });
  }

  async uploadDocument(payload, actor = '', context = {}) {
    const filename = payload.filename || payload.sourceFileName || 'document.bin';
    const buffer = Buffer.from(payload.contentBase64 || '', 'base64');
    const validation = this.validateUpload({
      filename,
      byteSize: buffer.byteLength || payload.byteSize || 0,
      mimeType: payload.mimeType,
    });
    if (!validation.valid) {
      const error = new Error(validation.errors.join('; '));
      error.statusCode = 400;
      throw error;
    }
    if (!payload.contentBase64) {
      const error = new Error('contentBase64 is required for upload');
      error.statusCode = 400;
      throw error;
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');
    const duplicates = (await this.documentRepository.list({ limit: 2000 })).filter(
      (item) => item.checksum && item.checksum === checksum
    );

    if (duplicates.length > 0 && !payload.overwriteDocumentId && !payload.allowDuplicate) {
      return {
        duplicate: true,
        matches: duplicates.map((item) => ({ id: item.id, title: item.title, version: item.version })),
        message: 'Duplicate content detected. Confirm overwrite or allowDuplicate.',
      };
    }

    const virus = await this.virusScan.scan({ buffer, filename });
    if (virus.status === 'infected') {
      const error = new Error('Upload blocked by virus scan abstraction');
      error.statusCode = 400;
      throw error;
    }

    const ocr = await this.ocr.extractText({ buffer, filename, mimeType: validation.expectedMime });
    const extension = validation.extension;
    const fileType = fileTypeFromExtension(extension);
    const timestamp = getDisplayDate();

    let document;
    if (payload.overwriteDocumentId) {
      const existing = await this.documentRepository.getById(payload.overwriteDocumentId);
      if (!existing) {
        const error = new Error('Document to overwrite was not found');
        error.statusCode = 404;
        throw error;
      }
      await this.ensureDocumentAccess(existing, 'write', context);
      const nextVersion = Number(existing.version || 1) + 1;
      const stored = await this.storage.save({
        documentId: existing.id,
        version: nextVersion,
        extension,
        buffer,
      });
      document = await this.documentRepository.update(existing.id, {
        ...existing,
        ...payload.metadata,
        title: payload.title || existing.title,
        description: payload.description || existing.description,
        category: payload.category || existing.category,
        tags: payload.tags || existing.tags,
        folderId: payload.folderId ?? existing.folderId,
        collectionId: payload.collectionId ?? existing.collectionId,
        version: nextVersion,
        fileType,
        sourceFileName: filename,
        size: `${(stored.byteSize / (1024 * 1024)).toFixed(2)} MB`,
        mimeType: validation.expectedMime,
        checksum: stored.checksum,
        byteSize: stored.byteSize,
        storageKey: stored.storageKey,
        content: buildSyntheticContent(
          { ...existing, title: payload.title || existing.title, fileType },
          ocr.text || ''
        ),
        updatedDate: timestamp,
        status: payload.status || existing.status || 'draft',
      });
      await this.documentRepository.createVersion(document, 'New file version uploaded', actor);
      await this.documentRepository.createDocumentFile({
        documentId: document.id,
        storageKey: stored.storageKey,
        originalName: filename,
        mimeType: validation.expectedMime,
        extension,
        byteSize: stored.byteSize,
        checksum: stored.checksum,
        version: nextVersion,
        ocrStatus: ocr.status === 'unsupported' ? 'unsupported' : ocr.status || 'skipped',
        virusScanStatus: virus.status || 'skipped',
      });
      await this.documentRepository.addDmsAudit({
        documentId: document.id,
        eventType: 'version_uploaded',
        actor,
        summary: `Uploaded new version v${nextVersion}`,
      });
    } else {
      const id = `doc-${Date.now()}-${randomUUID().slice(0, 8)}`;
      const stored = await this.storage.save({
        documentId: id,
        version: 1,
        extension,
        buffer,
      });
      const draft = {
        id,
        title: payload.title || filename.replace(/\.[^.]+$/, ''),
        category: payload.category || 'Documents',
        description: payload.description || '',
        tags: payload.tags || [],
        status: payload.status || 'draft',
        author: payload.author || actor || 'Document Manager',
        owner: payload.owner || actor || 'Document Manager',
        fileType,
        sourceFileName: filename,
        size: `${(stored.byteSize / (1024 * 1024)).toFixed(2)} MB`,
        folderId: payload.folderId || null,
        collectionId: payload.collectionId || null,
        language: payload.language || 'fr',
        priority: payload.priority ?? 2,
        aiVisibility: payload.aiVisibility !== false,
        securityClassification: payload.securityClassification || 'internal',
        mimeType: validation.expectedMime,
        checksum: stored.checksum,
        byteSize: stored.byteSize,
        storageKey: stored.storageKey,
        createdDate: timestamp,
        updatedDate: timestamp,
        version: 1,
        notes: payload.notes || '',
      };
      draft.content = buildSyntheticContent(draft, ocr.text || '');
      document = await this.documentRepository.create(draft);
      await this.documentRepository.createVersion(document, 'Initial upload', actor);
      await this.documentRepository.createDocumentFile({
        documentId: document.id,
        storageKey: stored.storageKey,
        originalName: filename,
        mimeType: validation.expectedMime,
        extension,
        byteSize: stored.byteSize,
        checksum: stored.checksum,
        version: 1,
        ocrStatus: ocr.status === 'unsupported' ? 'unsupported' : ocr.status || 'skipped',
        virusScanStatus: virus.status || 'skipped',
      });
      await this.documentRepository.addDmsAudit({
        documentId: document.id,
        eventType: 'upload',
        actor,
        summary: `Uploaded ${filename}`,
      });
    }

    if (payload.uploadSessionId) {
      await this.documentRepository.updateUploadSession(payload.uploadSessionId, {
        status: 'completed',
        receivedChunks: 1,
        checksum,
      });
    }

    await this.refreshCaches();
    this.scheduleRefreshIndex();
    return { document, duplicate: false, virus, ocr };
  }

  async downloadDocument(documentId, actor = '', context = {}) {
    const document = await this.documentRepository.getById(documentId);
    if (!document || document.status === 'deleted') {
      return null;
    }
    await this.ensureDocumentAccess(document, 'export', context);
    if (!document.storageKey) {
      const error = new Error('No stored binary is available for this document yet.');
      error.statusCode = 404;
      throw error;
    }

    const buffer = await this.storage.read(document.storageKey);
    await this.documentRepository.update(documentId, {
      ...document,
      downloadCount: Number(document.downloadCount || 0) + 1,
    });
    await this.documentRepository.addDmsAudit({
      documentId,
      eventType: 'download',
      actor,
      summary: `Downloaded ${document.sourceFileName || document.title}`,
    });
    await this.refreshCaches();

    return {
      document,
      buffer,
      filename: document.sourceFileName || `${document.title}.${String(document.fileType || 'bin').toLowerCase()}`,
      mimeType: document.mimeType || 'application/octet-stream',
      secureUrl: `/api/dms/documents/${documentId}/download`,
    };
  }

  async moveDocuments(documentIds, folderId, actor = '', context = {}) {
    const results = [];
    for (const documentId of documentIds) {
      const existing = await this.documentRepository.getById(documentId);
      if (!existing) continue;
      await this.ensureDocumentAccess(existing, 'write', context);
      const updated = await this.documentRepository.update(documentId, {
        ...existing,
        folderId: folderId || null,
        updatedDate: getDisplayDate(),
      });
      await this.documentRepository.addDmsAudit({
        documentId,
        folderId,
        eventType: 'move',
        actor,
        summary: `Moved document to folder ${folderId || 'root'}`,
      });
      results.push(updated);
    }
    await this.refreshCaches();
    this.scheduleRefreshIndex();
    return results;
  }

  async ensureWorkflow(document, actor = '') {
    if (!this.workflowEngine || !document?.id) {
      return null;
    }

    return this.workflowEngine.createGovernedWorkflow({
      subjectType: 'dms_document',
      subjectId: document.id,
      workflowDefinitionCode: 'document-review',
      policyCode: 'administration-policy',
      agentCode: 'enterprise-dms',
      priority: document.securityClassification === 'restricted' ? 'high' : 'normal',
      reviewers: ['Manager'],
      actor: actor || document.owner || 'enterprise-dms',
      source: 'enterprise_dms',
      metadata: {
        title: document.title,
        folderId: document.folderId,
        securityClassification: document.securityClassification,
        aclVisibility: document.aclVisibility,
        requiresHumanApproval: true,
      },
    });
  }

  async governTransition(existing, action, actor = '', comment = '') {
    if (!this.workflowEngine || !existing?.id) {
      return;
    }

    await this.ensureWorkflow(existing, actor);

    if (action === 'submit') {
      await this.workflowEngine.submitGovernedSubject(
        'dms_document',
        existing.id,
        actor || 'enterprise-dms',
        comment || 'DMS document submitted for review.'
      );
      return;
    }

    if (action === 'approve') {
      const workflow = await this.workflowEngine.approveGovernedSubject(
        'dms_document',
        existing.id,
        actor || 'enterprise-dms',
        comment || 'DMS document approved.'
      );
      if (workflow.currentState !== 'Approved') {
        const error = new Error('Additional workflow approvals are required before approving this document.');
        error.statusCode = 409;
        throw error;
      }
      return;
    }

    if (action === 'publish') {
      let workflow = await this.workflowEngine.getWorkflowBySubject('dms_document', existing.id);
      if (!['Approved', 'Exported'].includes(workflow?.currentState)) {
        workflow = await this.workflowEngine.approveGovernedSubject(
          'dms_document',
          existing.id,
          actor || 'enterprise-dms',
          comment || 'DMS document approved for publication.'
        );
      }
      if (workflow.currentState === 'Approved') {
        workflow = await this.workflowEngine.exportGovernedSubject(
          'dms_document',
          existing.id,
          actor || 'enterprise-dms',
          comment || 'DMS document published.'
        );
      }
      if (workflow.currentState !== 'Exported') {
        const error = new Error('Workflow approval is required before publishing this document.');
        error.statusCode = 409;
        throw error;
      }
      return;
    }

    if (action === 'corrections') {
      await this.workflowEngine.rejectGovernedSubject(
        'dms_document',
        existing.id,
        actor || 'enterprise-dms',
        comment || 'DMS document corrections requested.'
      );
    }
  }

  async transitionDocument(documentId, action, actor = '', comment = '', context = {}) {
    const existing = await this.documentRepository.getById(documentId);
    if (!existing) return null;
    await this.ensureDocumentAccess(
      existing,
      ['approve', 'publish'].includes(action) ? 'approve' : 'write',
      context
    );

    const map = {
      submit: 'review',
      approve: 'approved',
      publish: 'active',
      corrections: 'draft',
      archive: 'archived',
      restore: 'active',
    };
    const nextStatus = map[action];
    if (!nextStatus) {
      const error = new Error(`Unknown workflow action ${action}`);
      error.statusCode = 400;
      throw error;
    }

    await this.governTransition(existing, action, actor, comment);

    if (this.knowledgePlatform) {
      try {
        if (action === 'submit') {
          await this.knowledgePlatform.submitForReview(documentId, actor, comment, {
            skipWorkflow: true,
          });
        } else if (action === 'publish') {
          await this.knowledgePlatform.publishDocument(documentId, actor, comment, {
            skipWorkflow: true,
          });
        } else if (action === 'corrections') {
          await this.knowledgePlatform.requestCorrections(documentId, actor, comment, {
            skipWorkflow: true,
          });
        } else if (action === 'archive') {
          await this.knowledgePlatform.archiveDocument(documentId, actor, comment, {
            skipWorkflow: true,
          });
        } else {
          await this.knowledgePlatform.transitionStatus(
            documentId,
            nextStatus,
            actor,
            comment || action,
            { skipWorkflow: true }
          );
        }
      } catch {
        // Fall through to direct status update when transition matrix differs.
        await this.documentRepository.update(documentId, {
          ...existing,
          status: nextStatus,
          updatedDate: getDisplayDate(),
          approvalCount:
            nextStatus === 'approved' || nextStatus === 'active'
              ? Number(existing.approvalCount || 0) + 1
              : existing.approvalCount,
          lastReviewedAt:
            nextStatus === 'approved' || nextStatus === 'active'
              ? new Date().toISOString()
              : existing.lastReviewedAt,
          lastReviewedBy:
            nextStatus === 'approved' || nextStatus === 'active'
              ? actor
              : existing.lastReviewedBy,
        });
      }
    } else {
      await this.documentRepository.update(documentId, {
        ...existing,
        status: nextStatus,
        updatedDate: getDisplayDate(),
        approvalCount:
          nextStatus === 'approved' || nextStatus === 'active'
            ? Number(existing.approvalCount || 0) + 1
            : existing.approvalCount,
        lastReviewedAt:
          nextStatus === 'approved' || nextStatus === 'active'
            ? new Date().toISOString()
            : existing.lastReviewedAt,
        lastReviewedBy:
          nextStatus === 'approved' || nextStatus === 'active' ? actor : existing.lastReviewedBy,
      });
    }

    await this.documentRepository.addDmsAudit({
      documentId,
      eventType: action === 'approve' ? 'approval' : `workflow_${action}`,
      actor,
      summary: comment || `Workflow ${action}`,
    });
    await this.refreshCaches();
    this.scheduleRefreshIndex();
    return this.documentRepository.getById(documentId);
  }

  async getDocumentDetail(documentId, context = {}) {
    const document = await this.documentRepository.getById(documentId);
    if (!document || document.status === 'deleted') return null;
    await this.ensureDocumentAccess(document, 'read', context);
    const [files, versions, links, events, audit, breadcrumb] = await Promise.all([
      this.documentRepository.listDocumentFiles(documentId),
      this.documentRepository.listVersions(documentId),
      this.documentRepository.listLinks(documentId),
      this.documentRepository.listEvents(documentId),
      this.documentRepository.listDmsAudit({ documentId, limit: 50 }),
      document.folderId
        ? this.documentRepository.getFolderBreadcrumb(document.folderId)
        : Promise.resolve([]),
    ]);

    await this.documentRepository.update(documentId, {
      ...document,
      viewCount: Number(document.viewCount || 0) + 1,
    });

    return {
      document: await this.documentRepository.getById(documentId),
      files,
      versions,
      links,
      events,
      audit,
      breadcrumb,
    };
  }

  async getDocumentAcl(documentId, context = {}) {
    const document = await this.documentRepository.getById(documentId);
    if (!document || document.status === 'deleted') return null;
    await this.ensureDocumentAccess(document, 'read', context);
    const entries = this.documentAclService
      ? await this.documentAclService.getEffectiveAcl(document)
      : [];
    return { document, items: entries };
  }

  async shareDocument(documentId, payload = {}, actor = '', context = {}) {
    const document = await this.documentRepository.getById(documentId);
    if (!document || document.status === 'deleted') return null;
    await this.ensureDocumentAccess(document, 'owner', context);
    return this.documentAclService.shareDocument(document, payload, {
      ...(context.user || {}),
      email: actor || context.user?.email,
    });
  }

  async removeDocumentAclEntry(entryId, actor = '', context = {}) {
    return this.documentAclService.removeAclEntry(entryId, {
      ...(context.user || {}),
      email: actor || context.user?.email,
    });
  }

  async updateDocumentVisibility(documentId, payload = {}, actor = '', context = {}) {
    const document = await this.documentRepository.getById(documentId);
    if (!document || document.status === 'deleted') return null;
    await this.ensureDocumentAccess(document, 'owner', context);
    const updated = await this.documentRepository.update(documentId, {
      ...document,
      aclVisibility: payload.aclVisibility || document.aclVisibility || 'organization',
      aclInherits: payload.aclInherits !== undefined ? payload.aclInherits : document.aclInherits,
    });
    await this.documentRepository.addDmsAudit({
      documentId,
      eventType: 'acl_visibility_updated',
      actor,
      summary: `Updated ACL visibility to ${updated.aclVisibility}`,
      metadata: {
        aclVisibility: updated.aclVisibility,
        aclInherits: updated.aclInherits,
      },
    });
    return updated;
  }

  async exportMetadata(format = 'json', filters = {}) {
    const { items } = await this.search(filters);
    const rows = items.map((document) => ({
      id: document.id,
      title: document.title,
      description: document.description,
      folderId: document.folderId,
      collectionId: document.collectionId,
      category: document.category,
      tags: document.tags,
      owner: document.owner,
      author: document.author,
      language: document.language,
      status: document.status,
      priority: document.priority,
      version: document.version,
      fileType: document.fileType,
      byteSize: document.byteSize,
      checksum: document.checksum,
      securityClassification: document.securityClassification,
      aiVisibility: document.aiVisibility,
    }));

    if (format === 'csv') {
      const headers = Object.keys(rows[0] || { id: '', title: '' });
      const lines = [
        headers.join(','),
        ...rows.map((row) =>
          headers
            .map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`)
            .join(',')
        ),
      ];
      return { format: 'csv', body: lines.join('\n'), count: rows.length };
    }

    return { format: 'json', body: rows, count: rows.length };
  }

  async importMetadata(items = [], actor = '') {
    const imported = [];
    for (const item of items) {
      if (!item?.title || !item?.category) continue;
      const existing = item.id ? await this.documentRepository.getById(item.id) : null;
      if (existing) {
        imported.push(
          await this.documentRepository.update(existing.id, {
            ...existing,
            ...item,
            tags: item.tags || existing.tags,
            updatedDate: getDisplayDate(),
          })
        );
      } else {
        imported.push(
          await this.documentRepository.create({
            id: item.id || `doc-${Date.now()}-${randomUUID().slice(0, 6)}`,
            ...item,
            status: item.status || 'draft',
            fileType: item.fileType || 'TXT',
            createdDate: getDisplayDate(),
            updatedDate: getDisplayDate(),
            content: buildSyntheticContent(item),
          })
        );
      }
      await this.documentRepository.addDmsAudit({
        documentId: imported[imported.length - 1].id,
        eventType: 'metadata_import',
        actor,
        summary: 'Imported metadata',
      });
    }
    await this.refreshCaches();
    this.scheduleRefreshIndex();
    return { imported: imported.length, items: imported };
  }

  listAudit(filters) {
    return this.documentRepository.listDmsAudit(filters);
  }
}
