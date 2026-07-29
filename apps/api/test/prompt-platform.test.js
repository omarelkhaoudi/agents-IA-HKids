import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { PromptDefinitionRepository } from '../src/repositories/PromptDefinitionRepository.js';
import {
  PromptPlatformService,
  extractVariables,
  substituteVariables,
  validateVariables,
} from '../src/services/prompt/PromptPlatformService.js';

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  const repository = new PromptDefinitionRepository(pool);
  const service = new PromptPlatformService(pool, {
    promptRepository: repository,
    aiGateway: null,
  });
  await service.seedLibrariesIfEmpty();
  return { repository, service };
}

test('Prompt platform seeds empty libraries without inventing business prompts', async () => {
  const { service } = await createStack();
  const libraries = await service.listLibraries();
  assert.ok(libraries.length >= 8);
  assert.ok(libraries.some((item) => item.name === 'Shared'));
  assert.ok(libraries.every((item) => !/tarif|prix|price list/i.test(item.description)));
});

test('Prompt platform supports lifecycle, versioning and relationships', async () => {
  const { service } = await createStack();
  const libraries = await service.listLibraries();
  const created = await service.createPrompt(
    {
      promptGroupId: 'group-test',
      version: 1,
      status: 'draft',
      name: 'Lifecycle shell',
      description: 'Infrastructure prompt shell',
      role: 'Tester',
      objective: 'Validate lifecycle',
      systemPrompt: 'You are a test prompt for {{company}}.',
      instructions: ['Keep outputs reviewable'],
      constraints: ['No production actions'],
      validationChecklist: ['Human review'],
      outputStyle: 'Concise',
      libraryId: libraries[0].id,
      tags: ['test', 'lifecycle'],
      agentCode: 'administrative-assistant',
      language: 'fr',
    },
    'editor@hkids.test'
  );

  assert.equal(created.status, 'draft');
  assert.equal(created.version, 1);

  const updated = await service.updatePrompt(
    created.id,
    { description: 'Updated shell' },
    'editor@hkids.test',
    { changeSummary: 'Metadata update' }
  );
  assert.equal(updated.version, 2);

  const versions = await service.listVersions(created.id);
  assert.ok(versions.length >= 2);

  const inReview = await service.submitForReview(created.id, 'reviewer');
  assert.equal(inReview.status, 'review');

  const approved = await service.approvePrompt(created.id, 'manager');
  assert.equal(approved.status, 'approved');

  const published = await service.publishPrompt(created.id, 'manager');
  assert.equal(published.status, 'active');

  await service.addLink(
    {
      promptId: created.id,
      linkedType: 'workflow',
      linkedId: 'document-generation',
      label: 'Document workflow',
    },
    'manager'
  );

  const comparison = await service.compareVersions(created.id, 1, 2);
  assert.ok(comparison);
  assert.ok(comparison.sideBySide);
});

test('Prompt variables and playground dry-run work without changing production lifecycle', async () => {
  assert.deepEqual(extractVariables('Hello {{company}} and {{customer}}'), [
    'company',
    'customer',
  ]);
  assert.equal(
    substituteVariables('Hello {{company}}', { company: 'H-Kids' }),
    'Hello H-Kids'
  );
  const validation = validateVariables('Use {{price}}', { company: 'H-Kids' });
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.missing, ['price']);

  const { service } = await createStack();
  const prompt = await service.createPrompt(
    {
      promptGroupId: 'group-playground',
      version: 1,
      status: 'draft',
      name: 'Playground shell',
      description: 'Variable test',
      role: 'Tester',
      objective: 'Validate playground',
      systemPrompt: 'Respond for {{company}} in {{language}}.',
      instructions: ['Stay dry-run safe'],
      constraints: ['No side effects'],
      validationChecklist: ['Review output'],
      outputStyle: 'Short',
    },
    'tester'
  );

  const result = await service.runPlayground(prompt.id, {
    dryRun: true,
    variables: { company: 'H-Kids', language: 'fr' },
    actor: 'tester',
  });

  assert.equal(result.productionUnchanged, true);
  assert.match(result.assembledPrompt, /H-Kids/);
  assert.ok(result.testRun);

  const stillDraft = await service.getPromptDetail(prompt.id);
  assert.equal(stillDraft.prompt.status, 'draft');
});

test('Prompt platform analytics and search work', async () => {
  const { service } = await createStack();
  await service.createPrompt(
    {
      promptGroupId: 'group-analytics',
      version: 1,
      status: 'active',
      name: 'Analytics shell',
      description: 'Searchable shell',
      role: 'Analyst',
      objective: 'Support analytics',
      systemPrompt: 'System',
      instructions: ['Count usage'],
      constraints: ['Read only'],
      validationChecklist: ['Checked'],
      outputStyle: 'Bullets',
      tags: ['analytics'],
      category: 'Shared',
      agentCode: 'shared',
    },
    'analyst'
  );

  const search = await service.search({ search: 'Analytics', status: 'active', tag: 'analytics' });
  assert.ok(search.items.length >= 1);

  const dashboard = await service.getDashboard();
  assert.ok(dashboard.totalPrompts >= 1);
  assert.ok(dashboard.libraries >= 8);

  const analytics = await service.getAnalytics();
  assert.ok(Array.isArray(analytics.librariesUsage));
});

test('Prompt platform blocks invalid transitions', async () => {
  const { service } = await createStack();
  const prompt = await service.createPrompt(
    {
      promptGroupId: 'group-invalid',
      version: 1,
      status: 'draft',
      name: 'Invalid transition shell',
      description: 'Shell',
      role: 'Tester',
      objective: 'Validate guards',
      systemPrompt: 'System',
      instructions: ['Stay draft'],
      constraints: ['No skip'],
      validationChecklist: ['Checked'],
      outputStyle: 'Short',
    },
    'tester'
  );

  await assert.rejects(() => service.publishPrompt(prompt.id, 'manager'), /Cannot transition/);
});
