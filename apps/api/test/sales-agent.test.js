import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { SalesAgentRepository } from '../src/repositories/SalesAgentRepository.js';
import { SalesAgentService } from '../src/services/sales-agent/SalesAgentService.js';

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  const repository = new SalesAgentRepository(pool);

  const service = new SalesAgentService({
    repository,
    aiGateway: {
      generate: async () => ({
        text: JSON.stringify({
          title: 'Proposition H-Kids',
          body: 'Proposition commerciale préparée pour validation humaine.',
          summary: 'Offre accompagnement',
          arguments: ['Proximité', 'Confiance'],
          objections: ['Budget'],
          crossSell: ['Atelier découverte'],
          upsell: ['Pack familles'],
          discountSuggestionPercent: 5,
          nextSteps: ['Soumettre à validation'],
          faq: ['Quels délais ?'],
          terms: 'Validité 30 jours — validation humaine obligatoire.',
          notes: 'Ne pas envoyer automatiquement.',
        }),
        usage: { id: 'usage-sales', model: 'claude-3-5-sonnet-latest' },
      }),
    },
    retrievalService: {
      retrieveRelevantContext: () => ({
        contextText: 'Grille tarifaire H-Kids et procédures commerciales.',
        rankedChunks: [{ id: 'chunk-sales-1' }],
      }),
    },
    listDocuments: () => [
      {
        id: 'doc-sales',
        title: 'Guide pricing',
        category: 'Commercial',
        tags: ['sales', 'pricing'],
      },
    ],
    listPrompts: () => [
      {
        id: 'prompt-sales-quotation-001',
        promptGroupId: 'sales-quotation',
        name: 'Sales Quotation',
        objective: 'Prepare quotation drafts',
      },
      {
        id: 'prompt-sales-proposal-001',
        promptGroupId: 'sales-proposal',
        name: 'Sales Commercial Proposal',
        objective: 'Prepare proposals',
      },
    ],
  });

  await service.initialize();
  return { repository, service };
}

test('Sales Agent initializes catalog and demo company', async () => {
  const { repository } = await createStack();
  const products = await repository.listProducts();
  const companies = await repository.listCompanies();

  assert.ok(products.length >= 3);
  assert.ok(companies.length >= 1);
});

test('Sales Agent generates commercial draft without contacting clients', async () => {
  const { service } = await createStack();
  const result = await service.generateCommercialDocument({
    instruction: 'Prepare a proposal for a school partner',
    documentType: 'proposal',
    customerName: 'École Test',
  });

  assert.equal(result.document.approvalStatus, 'draft');
  assert.equal(result.document.documentType, 'proposal');
  assert.equal(result.document.metadata?.governance?.neverSend, true);
  assert.equal(result.document.metadata?.retrievalChunks, 1);
});

test('Sales Agent enforces quotation approval before export', async () => {
  const { service } = await createStack();
  const { quotation } = await service.generateQuotation({
    customerName: 'Client Test',
    title: 'Devis Test',
  });

  assert.equal(quotation.approvalStatus, 'draft');
  assert.ok(quotation.discountSuggestion >= 0);

  await assert.rejects(() => service.exportQuotation(quotation.id, 'markdown'), /approved/i);

  await service.submitQuotationReview(quotation.id);
  const approved = await service.approveQuotation(quotation.id, 'tester');
  assert.equal(approved.approvalStatus, 'approved');

  const exported = await service.exportQuotation(quotation.id, 'markdown');
  assert.match(exported.contentType, /markdown/);
  assert.match(exported.body, /human validation/i);
});

test('Sales Agent pipeline move and dashboard stats work', async () => {
  const { repository, service } = await createStack();
  const deal = await repository.createDeal({
    title: 'Deal pipeline',
    stage: 'new_lead',
    expectedRevenue: 8000,
  });

  const moved = await service.moveDealStage(deal.id, 'proposal');
  assert.equal(moved.stage, 'proposal');
  assert.equal(moved.probability, 60);

  const { quotation } = await service.generateQuotation({
    customerName: 'Pipeline Client',
    title: 'Devis pipeline',
    dealId: deal.id,
  });
  assert.ok(quotation.total >= 0);

  const stats = await repository.getDashboardStats();
  assert.equal(stats.openDeals >= 1, true);
  assert.equal(stats.quotations >= 1, true);

  const results = await repository.searchAll('pipeline');
  assert.ok(results.some((item) => item.type === 'deal' || item.type === 'quotation'));
});
