import { randomUUID } from 'node:crypto';
import {
  appendTenantFilter,
  tenantColumnsForInsert,
} from '../services/security/TenantContext.js';

function asJson(value, fallback) {
  if (value == null) {
    return fallback;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function mapCampaign(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    objective: row.objective,
    targetAudience: row.target_audience,
    platforms: asJson(row.platforms, []),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    approvalStatus: row.approval_status,
    performanceNotes: row.performance_notes,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    objective: row.objective,
    audience: row.audience,
    platform: row.platform,
    theme: row.theme,
    contentType: row.content_type,
    tone: row.tone,
    status: row.status,
    approvalStatus: row.approval_status,
    scheduledFor: row.scheduled_for,
    colorLabel: row.color_label,
    headline: row.headline,
    body: row.body,
    cta: row.cta,
    hashtags: asJson(row.hashtags, []),
    keywords: asJson(row.keywords, []),
    emojiSuggestions: asJson(row.emoji_suggestions, []),
    imageIdeas: asJson(row.image_ideas, []),
    timingSuggestion: row.timing_suggestion,
    alternatives: asJson(row.alternatives, []),
    sourcePrompt: row.source_prompt,
    conversationId: row.conversation_id,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

function mapLibraryItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    tags: asJson(row.tags, []),
    platform: row.platform,
    campaignId: row.campaign_id,
    postId: row.post_id,
    status: row.status,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGuidelines(row) {
  if (!row) return null;
  return {
    id: row.id,
    brandTone: row.brand_tone,
    vocabulary: asJson(row.vocabulary, []),
    forbiddenExpressions: asJson(row.forbidden_expressions, []),
    preferredExpressions: asJson(row.preferred_expressions, []),
    targetAudiences: asJson(row.target_audiences, []),
    communicationPrinciples: asJson(row.communication_principles, []),
    writingExamples: asJson(row.writing_examples, []),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    updatedAt: row.updated_at,
  };
}

export class CommunityManagerRepository {
  constructor(pool) {
    this.pool = pool;
  }

  buildTenantWhere() {
    const clauses = [];
    const values = [];
    appendTenantFilter(clauses, values);
    return {
      where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      values,
    };
  }

  async listCampaigns() {
    const { where, values } = this.buildTenantWhere();
    const result = await this.pool.query(
      `SELECT * FROM cm_campaigns ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapCampaign);
  }

  async getCampaign(id) {
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM cm_campaigns WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapCampaign(result.rows[0]);
  }

  async createCampaign(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `
        INSERT INTO cm_campaigns (
          id, name, objective, target_audience, platforms, start_date, end_date,
          status, approval_status, performance_notes, metadata, tenant_id, organization_id, owner_id
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)
      `,
      [
        id,
        payload.name,
        payload.objective || '',
        payload.targetAudience || '',
        JSON.stringify(payload.platforms || []),
        payload.startDate || null,
        payload.endDate || null,
        payload.status || 'draft',
        payload.approvalStatus || 'draft',
        payload.performanceNotes || '',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    return this.getCampaign(id);
  }

  async updateCampaign(id, payload) {
    const existing = await this.getCampaign(id);
    if (!existing) {
      throw Object.assign(new Error('Campaign not found.'), { statusCode: 404 });
    }

    const next = { ...existing, ...payload };
    await this.pool.query(
      `
        UPDATE cm_campaigns SET
          name = $2,
          objective = $3,
          target_audience = $4,
          platforms = $5::jsonb,
          start_date = $6,
          end_date = $7,
          status = $8,
          approval_status = $9,
          performance_notes = $10,
          metadata = $11::jsonb,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        next.name,
        next.objective || '',
        next.targetAudience || '',
        JSON.stringify(next.platforms || []),
        next.startDate || null,
        next.endDate || null,
        next.status || 'draft',
        next.approvalStatus || 'draft',
        next.performanceNotes || '',
        JSON.stringify(next.metadata || {}),
      ]
    );
    return this.getCampaign(id);
  }

  async deleteCampaign(id) {
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    await this.pool.query(`DELETE FROM cm_campaigns WHERE ${clauses.join(' AND ')}`, values);
    return { deleted: true, id };
  }

  async listPosts(filters = {}) {
    const clauses = [];
    const values = [];

    if (filters.platform) {
      values.push(filters.platform);
      clauses.push(`platform = $${values.length}`);
    }
    if (filters.approvalStatus) {
      values.push(filters.approvalStatus);
      clauses.push(`approval_status = $${values.length}`);
    }
    if (filters.campaignId) {
      values.push(filters.campaignId);
      clauses.push(`campaign_id = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search.toLowerCase()}%`);
      clauses.push(
        `(LOWER(title) LIKE $${values.length} OR LOWER(body) LIKE $${values.length} OR LOWER(theme) LIKE $${values.length})`
      );
    }
    appendTenantFilter(clauses, values);

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM cm_posts ${where} ORDER BY COALESCE(scheduled_for, created_at) DESC`,
      values
    );
    return result.rows.map(mapPost);
  }

  async getPost(id) {
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM cm_posts WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapPost(result.rows[0]);
  }

  async createPost(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `
        INSERT INTO cm_posts (
          id, campaign_id, title, objective, audience, platform, theme, content_type, tone,
          status, approval_status, scheduled_for, color_label, headline, body, cta,
          hashtags, keywords, emoji_suggestions, image_ideas, timing_suggestion,
          alternatives, source_prompt, conversation_id, metadata, tenant_id, organization_id, owner_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
          $17::jsonb,$18::jsonb,$19::jsonb,$20::jsonb,$21,$22::jsonb,$23,$24,$25::jsonb,$26,$27,$28
        )
      `,
      [
        id,
        payload.campaignId || null,
        payload.title,
        payload.objective || '',
        payload.audience || '',
        payload.platform || 'instagram',
        payload.theme || '',
        payload.contentType || 'post',
        payload.tone || 'friendly',
        payload.status || 'draft',
        payload.approvalStatus || 'draft',
        payload.scheduledFor || null,
        payload.colorLabel || 'violet',
        payload.headline || '',
        payload.body || '',
        payload.cta || '',
        JSON.stringify(payload.hashtags || []),
        JSON.stringify(payload.keywords || []),
        JSON.stringify(payload.emojiSuggestions || []),
        JSON.stringify(payload.imageIdeas || []),
        payload.timingSuggestion || '',
        JSON.stringify(payload.alternatives || []),
        payload.sourcePrompt || '',
        payload.conversationId || null,
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    return this.getPost(id);
  }

  async updatePost(id, payload) {
    const existing = await this.getPost(id);
    if (!existing) {
      throw Object.assign(new Error('Post not found.'), { statusCode: 404 });
    }

    const next = { ...existing, ...payload };
    await this.pool.query(
      `
        UPDATE cm_posts SET
          campaign_id = $2,
          title = $3,
          objective = $4,
          audience = $5,
          platform = $6,
          theme = $7,
          content_type = $8,
          tone = $9,
          status = $10,
          approval_status = $11,
          scheduled_for = $12,
          color_label = $13,
          headline = $14,
          body = $15,
          cta = $16,
          hashtags = $17::jsonb,
          keywords = $18::jsonb,
          emoji_suggestions = $19::jsonb,
          image_ideas = $20::jsonb,
          timing_suggestion = $21,
          alternatives = $22::jsonb,
          source_prompt = $23,
          conversation_id = $24,
          metadata = $25::jsonb,
          approved_at = $26,
          approved_by = $27,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        next.campaignId || null,
        next.title,
        next.objective || '',
        next.audience || '',
        next.platform,
        next.theme || '',
        next.contentType || 'post',
        next.tone || 'friendly',
        next.status || 'draft',
        next.approvalStatus || 'draft',
        next.scheduledFor || null,
        next.colorLabel || 'violet',
        next.headline || '',
        next.body || '',
        next.cta || '',
        JSON.stringify(next.hashtags || []),
        JSON.stringify(next.keywords || []),
        JSON.stringify(next.emojiSuggestions || []),
        JSON.stringify(next.imageIdeas || []),
        next.timingSuggestion || '',
        JSON.stringify(next.alternatives || []),
        next.sourcePrompt || '',
        next.conversationId || null,
        JSON.stringify(next.metadata || {}),
        next.approvedAt || null,
        next.approvedBy || null,
      ]
    );
    return this.getPost(id);
  }

  async deletePost(id) {
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    await this.pool.query(`DELETE FROM cm_posts WHERE ${clauses.join(' AND ')}`, values);
    return { deleted: true, id };
  }

  async getBrandGuidelines() {
    const { where, values } = this.buildTenantWhere();
    const result = await this.pool.query(
      `SELECT * FROM cm_brand_guidelines ${where} ORDER BY updated_at DESC LIMIT 1`,
      values
    );
    return mapGuidelines(result.rows[0]);
  }

  async upsertBrandGuidelines(payload) {
    const existing = await this.getBrandGuidelines();
    const tenant = tenantColumnsForInsert(payload);
    const id = existing?.id || `cm-brand-guidelines-${tenant.tenantId}-${tenant.organizationId}`;

    if (existing) {
      await this.pool.query(
        `
          UPDATE cm_brand_guidelines SET
            brand_tone = $2,
            vocabulary = $3::jsonb,
            forbidden_expressions = $4::jsonb,
            preferred_expressions = $5::jsonb,
            target_audiences = $6::jsonb,
            communication_principles = $7::jsonb,
            writing_examples = $8::jsonb,
            updated_at = NOW()
          WHERE id = $1 AND tenant_id = $9 AND organization_id = $10
        `,
        [
          id,
          payload.brandTone || '',
          JSON.stringify(payload.vocabulary || []),
          JSON.stringify(payload.forbiddenExpressions || []),
          JSON.stringify(payload.preferredExpressions || []),
          JSON.stringify(payload.targetAudiences || []),
          JSON.stringify(payload.communicationPrinciples || []),
          JSON.stringify(payload.writingExamples || []),
          tenant.tenantId,
          tenant.organizationId,
        ]
      );
    } else {
      await this.pool.query(
        `
          INSERT INTO cm_brand_guidelines (
            id, brand_tone, vocabulary, forbidden_expressions, preferred_expressions,
            target_audiences, communication_principles, writing_examples,
            tenant_id, organization_id, owner_id
          ) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11)
        `,
        [
          id,
          payload.brandTone || '',
          JSON.stringify(payload.vocabulary || []),
          JSON.stringify(payload.forbiddenExpressions || []),
          JSON.stringify(payload.preferredExpressions || []),
          JSON.stringify(payload.targetAudiences || []),
          JSON.stringify(payload.communicationPrinciples || []),
          JSON.stringify(payload.writingExamples || []),
          tenant.tenantId,
          tenant.organizationId,
          tenant.ownerId,
        ]
      );
    }

    return this.getBrandGuidelines();
  }

  async listLibraryItems(filters = {}) {
    const clauses = [];
    const values = [];

    if (filters.category) {
      values.push(filters.category);
      clauses.push(`category = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search.toLowerCase()}%`);
      clauses.push(
        `(LOWER(title) LIKE $${values.length} OR LOWER(content) LIKE $${values.length})`
      );
    }
    appendTenantFilter(clauses, values);

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM cm_library_items ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapLibraryItem);
  }

  async createLibraryItem(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `
        INSERT INTO cm_library_items (
          id, category, title, content, tags, platform, campaign_id, post_id, status, metadata,
          tenant_id, organization_id, owner_id
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11,$12,$13)
      `,
      [
        id,
        payload.category,
        payload.title,
        payload.content || '',
        JSON.stringify(payload.tags || []),
        payload.platform || null,
        payload.campaignId || null,
        payload.postId || null,
        payload.status || 'active',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM cm_library_items WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapLibraryItem(result.rows[0]);
  }

  async deleteLibraryItem(id) {
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    await this.pool.query(`DELETE FROM cm_library_items WHERE ${clauses.join(' AND ')}`, values);
    return { deleted: true, id };
  }

  async getDashboardStats() {
    const postScope = this.buildTenantWhere();
    const campaignScope = this.buildTenantWhere();
    const libraryScope = this.buildTenantWhere();
    const platformScope = this.buildTenantWhere();
    const [posts, campaigns, library, platforms] = await Promise.all([
      this.pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE approval_status = 'pending_review')::int AS pending,
          COUNT(*) FILTER (WHERE approval_status = 'draft')::int AS drafts,
          COUNT(*) FILTER (WHERE approval_status = 'rejected')::int AS rejected
        FROM cm_posts ${postScope.where}
      `, postScope.values),
      this.pool.query(
        `SELECT COUNT(*)::int AS total FROM cm_campaigns ${campaignScope.where}`,
        campaignScope.values
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS total FROM cm_library_items ${libraryScope.where}`,
        libraryScope.values
      ),
      this.pool.query(`
        SELECT platform, COUNT(*)::int AS total
        FROM cm_posts
        ${platformScope.where}
        GROUP BY platform
        ORDER BY total DESC
      `, platformScope.values),
    ]);

    const row = posts.rows[0] || {};
    return {
      generatedPosts: row.total || 0,
      approvedPosts: row.approved || 0,
      pendingApproval: row.pending || 0,
      draftPosts: row.drafts || 0,
      rejectedPosts: row.rejected || 0,
      campaigns: campaigns.rows[0]?.total || 0,
      libraryItems: library.rows[0]?.total || 0,
      mostActivePlatform: platforms.rows[0]?.platform || 'instagram',
      platforms: platforms.rows,
      approvalRate:
        row.total > 0 ? Number((((row.approved || 0) / row.total) * 100).toFixed(1)) : 0,
    };
  }

  async searchAll(query) {
    const q = `%${String(query || '').toLowerCase()}%`;
    const postClauses = ['(LOWER(title) LIKE $1 OR LOWER(body) LIKE $1)'];
    const campaignClauses = ['(LOWER(name) LIKE $1 OR LOWER(objective) LIKE $1)'];
    const libraryClauses = ['(LOWER(title) LIKE $1 OR LOWER(content) LIKE $1)'];
    const postValues = [q];
    const campaignValues = [q];
    const libraryValues = [q];
    appendTenantFilter(postClauses, postValues);
    appendTenantFilter(campaignClauses, campaignValues);
    appendTenantFilter(libraryClauses, libraryValues);
    const [posts, campaigns, library] = await Promise.all([
      this.pool.query(
        `SELECT id, title, 'post' AS type FROM cm_posts
         WHERE ${postClauses.join(' AND ')} LIMIT 20`,
        postValues
      ),
      this.pool.query(
        `SELECT id, name AS title, 'campaign' AS type FROM cm_campaigns
         WHERE ${campaignClauses.join(' AND ')} LIMIT 20`,
        campaignValues
      ),
      this.pool.query(
        `SELECT id, title, 'library' AS type FROM cm_library_items
         WHERE ${libraryClauses.join(' AND ')} LIMIT 20`,
        libraryValues
      ),
    ]);

    return [...posts.rows, ...campaigns.rows, ...library.rows];
  }
}
