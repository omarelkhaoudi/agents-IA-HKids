import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { CommunityManagerRepository } from '../src/repositories/CommunityManagerRepository.js';
import { CommunityManagerService } from '../src/services/community-manager/CommunityManagerService.js';

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  const repository = new CommunityManagerRepository(pool);

  const service = new CommunityManagerService({
    repository,
    aiGateway: {
      generate: async () => ({
        text: JSON.stringify({
          headline: 'H-Kids avec les familles',
          body: 'Un rappel bienveillant pour les parents.',
          cta: 'Parlez à votre équipe H-Kids',
          hashtags: ['#HKids', '#Parents'],
          keywords: ['familles'],
          emojiSuggestions: ['💙'],
          imageIdeas: ['Photo équipe'],
          timingSuggestion: '09:30',
          alternatives: ['Version courte'],
        }),
        usage: { id: 'usage-test', model: 'claude-3-5-sonnet-latest' },
      }),
    },
    retrievalService: {
      retrieveRelevantContext: () => ({
        contextText: 'H-Kids accompagne les familles.',
        rankedChunks: [{ id: 'chunk-1' }],
      }),
    },
    listDocuments: () => [
      {
        id: 'doc-mkt',
        title: 'Guide marketing',
        category: 'Marketing',
        tags: ['marketing', 'brand'],
      },
    ],
    listPrompts: () => [
      {
        id: 'prompt-cm-instagram-001',
        promptGroupId: 'cm-instagram',
        name: 'Community Manager Instagram',
        objective: 'Prepare Instagram drafts',
      },
    ],
  });

  await service.initialize();
  return { repository, service };
}

test('Community Manager initializes brand guidelines and library', async () => {
  const { repository } = await createStack();
  const guidelines = await repository.getBrandGuidelines();
  const library = await repository.listLibraryItems();

  assert.ok(guidelines?.brandTone);
  assert.ok(library.length >= 3);
});

test('Community Manager generates draft content without publishing', async () => {
  const { service } = await createStack();
  const result = await service.generateContent({
    instruction: 'Prepare an Instagram tip for parents',
    platform: 'instagram',
    tone: 'parents',
    audience: 'Parents',
  });

  assert.equal(result.post.approvalStatus, 'draft');
  assert.equal(result.post.platform, 'instagram');
  assert.match(result.post.body, /parents|H-Kids|bienveillant/i);
  assert.equal(result.post.metadata?.retrievalChunks, 1);
});

test('Community Manager enforces approval before export', async () => {
  const { service } = await createStack();
  const { post } = await service.generateContent({
    instruction: 'Facebook announcement',
    platform: 'facebook',
  });

  await assert.rejects(() => service.exportPost(post.id, 'markdown'), /approved/i);

  await service.submitForReview(post.id);
  const approved = await service.approvePost(post.id, 'tester');
  assert.equal(approved.approvalStatus, 'approved');

  const exported = await service.exportPost(post.id, 'markdown');
  assert.match(exported.contentType, /markdown/);
  assert.match(exported.body, /human validation/i);
});

test('Community Manager dashboard stats and search work', async () => {
  const { repository, service } = await createStack();
  await service.generateContent({
    instruction: 'LinkedIn post for schools',
    platform: 'linkedin',
    title: 'Partenariat écoles',
  });

  const stats = await repository.getDashboardStats();
  assert.equal(stats.generatedPosts >= 1, true);

  const results = await repository.searchAll('écoles');
  assert.ok(results.some((item) => item.type === 'post'));
});
