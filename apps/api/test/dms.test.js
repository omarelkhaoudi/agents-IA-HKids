import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { KnowledgeDocumentRepository } from '../src/repositories/KnowledgeDocumentRepository.js';
import { KnowledgePlatformService } from '../src/services/knowledge/KnowledgePlatformService.js';
import { DocumentManagementService } from '../src/services/dms/DocumentManagementService.js';

class MemoryStorage {
  constructor() {
    this.files = new Map();
  }

  async save({ documentId, version, extension, buffer }) {
    const storageKey = `${documentId}/v${version}.${extension || 'bin'}`;
    this.files.set(storageKey, buffer);
    return {
      storageKey,
      checksum: createHash('sha256').update(buffer).digest('hex'),
      byteSize: buffer.byteLength,
    };
  }

  async read(storageKey) {
    const buffer = this.files.get(storageKey);
    if (!buffer) throw new Error('missing');
    return buffer;
  }

  async remove(storageKey) {
    return this.files.delete(storageKey);
  }
}

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  const repository = new KnowledgeDocumentRepository(pool);
  const knowledgePlatform = new KnowledgePlatformService(pool, {
    documentRepository: repository,
  });
  const service = new DocumentManagementService(pool, {
    documentRepository: repository,
    knowledgePlatform,
    infrastructure: {
      storage: new MemoryStorage(),
      maxUploadBytes: 5 * 1024 * 1024,
    },
  });
  await service.seedFoldersIfEmpty();
  return { repository, service, knowledgePlatform };
}

test('DMS seeds nested folders without inventing business documents', async () => {
  const { service } = await createStack();
  const folders = await service.listFolders();
  assert.ok(folders.length >= 5);
  assert.ok(folders.some((item) => item.name === 'Incoming' && item.isPinned));
  assert.ok(folders.some((item) => item.parentId === 'folder-root-shared'));
});

test('DMS upload, duplicate detection, download and workflow work', async () => {
  const { service } = await createStack();
  const folders = await service.listFolders();
  const contentBase64 = Buffer.from('Hello DMS infrastructure').toString('base64');

  const uploaded = await service.uploadDocument(
    {
      filename: 'guide.txt',
      contentBase64,
      mimeType: 'text/plain',
      folderId: folders[0].id,
      category: 'Documents',
      tags: ['dms', 'infra'],
      status: 'draft',
    },
    'editor@hkids.test'
  );

  assert.equal(uploaded.duplicate, false);
  assert.equal(uploaded.document.status, 'draft');
  assert.ok(uploaded.document.storageKey);
  assert.ok(uploaded.document.checksum);

  const duplicate = await service.uploadDocument(
    {
      filename: 'guide-copy.txt',
      contentBase64,
      mimeType: 'text/plain',
      folderId: folders[0].id,
      category: 'Documents',
    },
    'editor@hkids.test'
  );
  assert.equal(duplicate.duplicate, true);

  const downloaded = await service.downloadDocument(uploaded.document.id, 'viewer@hkids.test');
  assert.ok(downloaded.buffer);
  assert.match(downloaded.secureUrl, /\/api\/dms\/documents\//);

  const submitted = await service.transitionDocument(uploaded.document.id, 'submit', 'editor');
  assert.equal(submitted.status, 'review');
  const approved = await service.transitionDocument(uploaded.document.id, 'approve', 'manager');
  assert.equal(approved.status, 'approved');
  const published = await service.transitionDocument(uploaded.document.id, 'publish', 'manager');
  assert.equal(published.status, 'active');
});

test('DMS folders move/rename/archive and search/analytics work', async () => {
  const { service } = await createStack();
  const created = await service.createFolder(
    {
      name: 'Projects',
      description: 'Nested project folder shell',
      parentId: 'folder-root-shared',
    },
    'manager'
  );
  assert.equal(created.name, 'Projects');

  const renamed = await service.renameFolder(created.id, 'Active Projects', 'manager');
  assert.equal(renamed.name, 'Active Projects');

  const moved = await service.moveFolder(created.id, 'folder-root-incoming', 'manager');
  assert.equal(moved.parentId, 'folder-root-incoming');

  const breadcrumb = await service.getFolderBreadcrumb(created.id);
  assert.ok(breadcrumb.length >= 2);

  await service.uploadDocument(
    {
      filename: 'notes.md',
      contentBase64: Buffer.from('# Notes').toString('base64'),
      mimeType: 'text/markdown',
      folderId: created.id,
      category: 'Documents',
      tags: ['notes'],
    },
    'editor'
  );

  await service.moveDocuments(
    [(await service.search({ folderId: created.id })).items[0].id],
    'folder-root-shared',
    'editor'
  );

  const search = await service.search({ search: 'Notes', tag: 'notes' });
  assert.ok(search.items.length >= 1);

  const dashboard = await service.getDashboard();
  assert.ok(dashboard.totalDocuments >= 1);
  assert.ok(dashboard.folders >= 1);

  const analytics = await service.getAnalytics();
  assert.ok(Array.isArray(analytics.folderUsage));

  await service.archiveFolder(created.id, 'manager');
  const archived = await service.listFolders();
  assert.ok(archived.some((item) => item.id === created.id && item.status === 'archived'));
});

test('DMS rejects unsupported extensions and records audit events', async () => {
  const { service } = await createStack();
  await assert.rejects(
    () =>
      service.uploadDocument(
        {
          filename: 'malware.exe',
          contentBase64: Buffer.from('x').toString('base64'),
          mimeType: 'application/octet-stream',
        },
        'editor'
      ),
    /Unsupported extension/
  );

  const session = await service.startUploadSession(
    {
      filename: 'spec.pdf',
      mimeType: 'application/pdf',
      byteSize: 1200,
      totalChunks: 2,
    },
    'editor'
  );
  assert.equal(session.status, 'open');
  const chunked = await service.receiveUploadChunk(session.id, { chunkIndex: 0 });
  assert.equal(chunked.receivedChunks, 1);
  await service.cancelUploadSession(session.id, 'editor');

  const audit = await service.listAudit({ limit: 20 });
  assert.ok(audit.some((item) => item.eventType === 'upload_cancelled'));
});
