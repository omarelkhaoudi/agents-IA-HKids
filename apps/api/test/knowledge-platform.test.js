import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { KnowledgeDocumentRepository } from '../src/repositories/KnowledgeDocumentRepository.js';
import { KnowledgePlatformService } from '../src/services/knowledge/KnowledgePlatformService.js';

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  const repository = new KnowledgeDocumentRepository(pool);
  const service = new KnowledgePlatformService(pool, { documentRepository: repository });
  await service.seedCollectionsIfEmpty();
  return { repository, service };
}

test('Knowledge platform seeds empty collections without business content', async () => {
  const { service } = await createStack();
  const collections = await service.listCollections();
  assert.ok(collections.length >= 10);
  assert.ok(collections.some((item) => item.name === 'Shared Knowledge'));
  assert.ok(collections.every((item) => item.description && !/price|tarif|prix/i.test(item.description)));
});

test('Knowledge platform supports metadata, versioning and review workflow', async () => {
  const { service } = await createStack();
  const collections = await service.listCollections();
  const created = await service.createDocument(
    {
      title: 'Policy shell',
      category: 'Policies',
      description: 'Placeholder metadata only',
      tags: ['policy', 'internal'],
      status: 'draft',
      author: 'Editor',
      owner: 'Knowledge Manager',
      language: 'fr',
      collectionId: collections[0].id,
      fileType: 'MD',
      size: '0.1 MB',
      sourceFileName: 'policy.md',
    },
    'editor@hkids.test'
  );

  assert.equal(created.status, 'draft');
  assert.equal(created.version, 1);
  assert.ok(created.qualityScore >= 0);

  const updated = await service.updateDocument(
    created.id,
    { description: 'Updated placeholder metadata', tags: ['policy', 'review'] },
    'editor@hkids.test',
    { changeSummary: 'Metadata refinement' }
  );
  assert.equal(updated.version, 2);

  const versions = await service.listVersions(created.id);
  assert.ok(versions.length >= 1);

  const inReview = await service.submitForReview(created.id, 'reviewer@hkids.test', 'Please review');
  assert.equal(inReview.status, 'review');

  const published = await service.publishDocument(created.id, 'manager@hkids.test', 'Approved');
  assert.equal(published.status, 'active');
  assert.ok(published.approvalCount >= 1);

  const comparison = await service.compareVersions(created.id, versions[0].version, versions[0].version);
  assert.ok(comparison);
});

test('Knowledge platform search, relationships, tags and analytics work', async () => {
  const { service } = await createStack();
  const collections = await service.listCollections();
  const document = await service.createDocument(
    {
      title: 'Training outline shell',
      category: 'Training',
      description: 'Empty training outline for future content',
      tags: ['training', 'onboarding'],
      status: 'active',
      author: 'Trainer',
      collectionId: collections.find((item) => item.name === 'Training')?.id,
      language: 'fr',
      fileType: 'TXT',
      size: '0.2 MB',
      sourceFileName: 'training.txt',
    },
    'trainer@hkids.test'
  );

  await service.addLink(
    {
      documentId: document.id,
      linkedType: 'agent',
      linkedId: 'hr-agent',
      label: 'HR Agent',
    },
    'trainer@hkids.test'
  );

  const search = await service.search({ search: 'training', status: 'active', tag: 'training' });
  assert.ok(search.items.some((item) => item.id === document.id));

  const agentSearch = await service.search({ agent: 'hr-agent' });
  assert.ok(agentSearch.items.some((item) => item.id === document.id));

  await service.upsertTag({ name: 'training', color: 'cyan' });
  await service.upsertTag({ name: 'formation', color: 'blue' });
  await service.mergeTags('formation', 'training');

  const dashboard = await service.getDashboard();
  assert.ok(dashboard.totalDocuments >= 1);
  assert.ok(dashboard.collections >= 10);

  const analytics = await service.getAnalytics();
  assert.ok(analytics.documentQuality.average >= 0);
  assert.ok(Array.isArray(analytics.collectionsGrowth));

  const bulk = await service.bulkAction('duplicate', [document.id], {}, 'admin@hkids.test');
  assert.equal(bulk.count, 1);

  const exported = await service.exportMetadata({ status: 'active' });
  assert.ok(exported.count >= 1);
});

test('Knowledge platform soft-deletes documents and blocks invalid transitions', async () => {
  const { service } = await createStack();
  const document = await service.createDocument(
    {
      title: 'Temp draft',
      category: 'Administration',
      description: 'Temporary',
      tags: ['temp'],
      status: 'draft',
      author: 'Editor',
      fileType: 'TXT',
      size: '0.0 MB',
      sourceFileName: 'temp.txt',
    },
    'editor@hkids.test'
  );

  await assert.rejects(() => service.publishDocument(document.id, 'manager'), /Cannot transition/);

  await service.removeDocument(document.id, 'editor@hkids.test');
  const detail = await service.getDocumentDetail(document.id);
  assert.equal(detail, null);
});
