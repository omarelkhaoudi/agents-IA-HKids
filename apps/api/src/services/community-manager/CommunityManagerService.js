const DEFAULT_GUIDELINES = {
  brandTone:
    'Chaleureux, rassurant et professionnel. H-Kids parle aux parents, aux écoles et aux partenaires avec clarté et bienveillance.',
  vocabulary: [
    'accompagnement',
    'enfants',
    'familles',
    'écoles',
    'sécurité',
    'confiance',
    'proximité',
  ],
  forbiddenExpressions: [
    'garantie à 100%',
    'offre illimitée',
    'sans validation',
    'publication automatique',
  ],
  preferredExpressions: [
    'préparé pour validation',
    'au service des familles',
    'avec votre équipe H-Kids',
  ],
  targetAudiences: ['Parents', 'Écoles', 'Partenaires', 'Communauté locale'],
  communicationPrinciples: [
    'Jamais de publication automatique.',
    'Toujours préparer un brouillon pour validation humaine.',
    'Respecter le ton H-Kids et éviter les promesses excessives.',
    'Adapter le vocabulaire selon la plateforme et l’audience.',
  ],
  writingExamples: [
    'Découvrez comment H-Kids accompagne les familles au quotidien, avec proximité et confiance.',
    'Un rappel utile pour les parents : nos équipes restent disponibles pour vous orienter.',
  ],
};

const TONE_GUIDANCE = {
  professional: 'Tone professionnel, clair, sobre.',
  friendly: 'Tone amical, accessible, chaleureux.',
  educational: 'Tone pédagogique, structuré, utile.',
  inspirational: 'Tone inspirant, positif, motivant.',
  promotional: 'Tone promotionnel mesuré, orienté bénéfice, sans survente.',
  corporate: 'Tone institutionnel et corporate.',
  parents: 'Tone rassurant destiné aux parents.',
  schools: 'Tone collaboratif destiné aux écoles.',
  partners: 'Tone partenarial et professionnel.',
};

const BASE_HASHTAGS = {
  brand: ['#HKids', '#HKidsMaroc', '#AccompagnementEnfants'],
  educational: ['#Education', '#Parents', '#ConseilParents', '#Ecole'],
  local: ['#Casablanca', '#Maroc', '#CommunautéLocale'],
  campaign: ['#HKidsCampaign', '#EnsemblePourLesEnfants'],
  popular: ['#Famille', '#Bienveillance', '#Confiance', '#Proximité'],
};

function safeParseGeneratedContent(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    return {
      headline: 'Brouillon H-Kids',
      body: trimmed || 'Contenu généré à valider.',
      cta: 'En savoir plus avec H-Kids',
      hashtags: BASE_HASHTAGS.brand,
      keywords: ['H-Kids', 'familles'],
      emojiSuggestions: ['💙', '✨', '👨‍👩‍👧'],
      imageIdeas: ['Photo d’équipe H-Kids', 'Illustration chaleureuse'],
      timingSuggestion: 'Matin en semaine (09:00–11:00)',
      alternatives: [],
    };
  }
}

export class CommunityManagerService {
  constructor({ repository, aiGateway, retrievalService, listDocuments, listPrompts }) {
    this.repository = repository;
    this.aiGateway = aiGateway;
    this.retrievalService = retrievalService;
    this.listDocuments = listDocuments;
    this.listPrompts = listPrompts;
  }

  async initialize() {
    const existing = await this.repository.getBrandGuidelines();
    if (!existing) {
      await this.repository.upsertBrandGuidelines(DEFAULT_GUIDELINES);
    }

    const library = await this.repository.listLibraryItems();
    if (!library.length) {
      await this.repository.createLibraryItem({
        category: 'hashtag',
        title: 'Brand hashtags',
        content: BASE_HASHTAGS.brand.join(' '),
        tags: ['brand'],
      });
      await this.repository.createLibraryItem({
        category: 'cta',
        title: 'CTA validation',
        content: 'Contenu préparé pour validation humaine — aucune publication automatique.',
        tags: ['governance'],
      });
      await this.repository.createLibraryItem({
        category: 'template',
        title: 'Instagram educational',
        content: 'Hook + conseil utile + CTA doux + hashtags H-Kids.',
        tags: ['instagram', 'educational'],
        platform: 'instagram',
      });
    }
  }

  suggestHashtags({ theme = '', audience = '', platform = 'instagram' } = {}) {
    const themeTags = String(theme)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => `#${part.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '')}`)
      .filter((tag) => tag.length > 2);

    return {
      popular: BASE_HASHTAGS.popular,
      brand: BASE_HASHTAGS.brand,
      educational: BASE_HASHTAGS.educational,
      local: BASE_HASHTAGS.local,
      campaign: BASE_HASHTAGS.campaign,
      suggested: [
        ...BASE_HASHTAGS.brand,
        ...BASE_HASHTAGS.educational.slice(0, 2),
        ...themeTags,
        platform === 'linkedin' ? '#Leadership' : '#Communauté',
        audience.toLowerCase().includes('école') ? '#Ecoles' : '#Parents',
      ].filter((value, index, array) => array.indexOf(value) === index),
    };
  }

  buildSystemPrompt(guidelines, tone) {
    const toneText = TONE_GUIDANCE[tone] || TONE_GUIDANCE.friendly;
    return [
      'You are the Community Manager AI for H-Kids.',
      'You ONLY prepare draft social and marketing content for human validation.',
      'Never publish. Never claim content was posted. Never invent discounts or legal commitments.',
      `Tone guidance: ${toneText}`,
      `Brand tone: ${guidelines?.brandTone || DEFAULT_GUIDELINES.brandTone}`,
      `Preferred vocabulary: ${(guidelines?.vocabulary || []).join(', ')}`,
      `Forbidden expressions: ${(guidelines?.forbiddenExpressions || []).join(', ')}`,
      `Preferred expressions: ${(guidelines?.preferredExpressions || []).join(', ')}`,
      `Principles: ${(guidelines?.communicationPrinciples || []).join(' | ')}`,
      'Respond ONLY with valid JSON containing keys: headline, body, cta, hashtags, keywords, emojiSuggestions, imageIdeas, timingSuggestion, alternatives.',
      'alternatives must be an array of short alternate body variants.',
    ].join('\n');
  }

  async generateContent(payload = {}, userId) {
    const guidelines = (await this.repository.getBrandGuidelines()) || DEFAULT_GUIDELINES;
    const instruction = payload.instruction || payload.title || 'Prepare a H-Kids social post draft.';
    const retrieval = this.retrievalService.retrieveRelevantContextAsync
      ? await this.retrievalService.retrieveRelevantContextAsync(instruction, {
          agentCode: 'community-manager',
          promptId: payload.promptId,
          promptAwareText: payload.theme || payload.objective || '',
        })
      : this.retrievalService.retrieveRelevantContext(instruction);
    const hashtags = this.suggestHashtags(payload);
    const cmPrompts = this.listPrompts().filter(
      (prompt) =>
        prompt.promptGroupId?.startsWith('cm-') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('community')
    );
    const selectedPrompt = cmPrompts.find((prompt) => prompt.id === payload.promptId) || cmPrompts[0];

    const userMessage = [
      `Platform: ${payload.platform || 'instagram'}`,
      `Content type: ${payload.contentType || 'post'}`,
      `Audience: ${payload.audience || 'Parents'}`,
      `Theme: ${payload.theme || 'H-Kids'}`,
      `Objective: ${payload.objective || 'Engagement'}`,
      `Tone: ${payload.tone || 'friendly'}`,
      `Instruction: ${instruction}`,
      selectedPrompt
        ? `Prompt template: ${selectedPrompt.name} — ${selectedPrompt.objective}`
        : '',
      `Knowledge context:\n${retrieval.contextText || retrieval.context || 'None'}`,
      `Suggested hashtags: ${hashtags.suggested.join(' ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const generation = await this.aiGateway.generate({
      provider: payload.provider,
      model: payload.model,
      systemPrompt: this.buildSystemPrompt(guidelines, payload.tone || 'friendly'),
      messages: [{ role: 'user', content: userMessage }],
      userId,
      agentCode: 'community-manager',
      conversationId: payload.conversationId,
    });

    const parsed = safeParseGeneratedContent(generation.text);
    const post = await this.repository.createPost({
      campaignId: payload.campaignId,
      title: payload.title || parsed.headline || 'Generated content',
      objective: payload.objective || '',
      audience: payload.audience || 'Parents',
      platform: payload.platform || 'instagram',
      theme: payload.theme || '',
      contentType: payload.contentType || 'post',
      tone: payload.tone || 'friendly',
      status: 'draft',
      approvalStatus: 'draft',
      scheduledFor: payload.scheduledFor || null,
      colorLabel: payload.colorLabel || 'violet',
      headline: parsed.headline || '',
      body: parsed.body || '',
      cta: parsed.cta || '',
      hashtags: parsed.hashtags || hashtags.suggested,
      keywords: parsed.keywords || [],
      emojiSuggestions: parsed.emojiSuggestions || [],
      imageIdeas: parsed.imageIdeas || [],
      timingSuggestion: parsed.timingSuggestion || '',
      alternatives: parsed.alternatives || [],
      sourcePrompt: instruction,
      conversationId: payload.conversationId || null,
      metadata: {
        usageId: generation.usage?.id,
        model: generation.model || generation.usage?.model,
        retrievalChunks: retrieval.rankedChunks?.length || 0,
      },
    });

    return { post, hashtags, retrieval, generation };
  }

  async submitForReview(postId) {
    return this.repository.updatePost(postId, { approvalStatus: 'pending_review' });
  }

  async approvePost(postId, actor = 'reviewer') {
    const post = await this.repository.updatePost(postId, {
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: actor,
    });

    await this.repository.createLibraryItem({
      category: 'approved_post',
      title: post.title,
      content: [post.headline, post.body, post.cta, (post.hashtags || []).join(' ')].join('\n\n'),
      tags: [post.platform, post.tone],
      platform: post.platform,
      campaignId: post.campaignId,
      postId: post.id,
    });

    return post;
  }

  async rejectPost(postId, actor = 'reviewer') {
    const post = await this.repository.updatePost(postId, {
      approvalStatus: 'rejected',
      approvedBy: actor,
    });

    await this.repository.createLibraryItem({
      category: 'rejected_post',
      title: post.title,
      content: post.body,
      tags: [post.platform, 'rejected'],
      platform: post.platform,
      postId: post.id,
    });

    return post;
  }

  async exportPost(postId, format = 'markdown') {
    const post = await this.repository.getPost(postId);
    if (!post) {
      throw Object.assign(new Error('Post not found.'), { statusCode: 404 });
    }

    if (!['approved', 'exported'].includes(post.approvalStatus)) {
      throw Object.assign(
        new Error('Content must be approved before export. No automatic publication.'),
        { statusCode: 409 }
      );
    }

    const markdown = [
      `# ${post.headline || post.title}`,
      '',
      post.body,
      '',
      post.cta ? `**CTA:** ${post.cta}` : '',
      post.hashtags?.length ? `**Hashtags:** ${post.hashtags.join(' ')}` : '',
      post.timingSuggestion ? `**Timing suggestion:** ${post.timingSuggestion}` : '',
      '',
      '_Prepared by Community Manager AI — human validation required before publication._',
    ]
      .filter(Boolean)
      .join('\n');

    const html = `<article><h1>${escapeHtml(post.headline || post.title)}</h1><p>${escapeHtml(post.body).replace(/\n/g, '<br/>')}</p><p><strong>CTA:</strong> ${escapeHtml(post.cta || '')}</p><p>${escapeHtml((post.hashtags || []).join(' '))}</p><p><em>Draft prepared for human validation. Never published automatically.</em></p></article>`;

    await this.repository.updatePost(postId, { approvalStatus: 'exported' });

    if (format === 'html') {
      return {
        contentType: 'text/html; charset=utf-8',
        filename: `${slugify(post.title)}.html`,
        body: html,
      };
    }

    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: `${slugify(post.title)}.json`,
        body: JSON.stringify(post, null, 2),
      };
    }

    return {
      contentType: 'text/markdown; charset=utf-8',
      filename: `${slugify(post.title)}.md`,
      body: markdown,
    };
  }

  async getWorkspaceBootstrap() {
    const [guidelines, campaigns, posts, library, stats, documents, prompts] = await Promise.all([
      this.repository.getBrandGuidelines(),
      this.repository.listCampaigns(),
      this.repository.listPosts(),
      this.repository.listLibraryItems(),
      this.repository.getDashboardStats(),
      Promise.resolve(this.listDocuments()),
      Promise.resolve(this.listPrompts()),
    ]);

    return {
      agentCode: 'community-manager',
      guidelines,
      campaigns,
      posts,
      library,
      stats,
      knowledgeDocuments: documents.filter(
        (document) =>
          String(document.category || '')
            .toLowerCase()
            .includes('marketing') ||
          String(document.category || '')
            .toLowerCase()
            .includes('brand') ||
          (document.tags || []).some((tag) =>
            ['community', 'marketing', 'brand', 'social'].includes(String(tag).toLowerCase())
          )
      ),
      prompts: prompts.filter(
        (prompt) =>
          prompt.promptGroupId?.startsWith('cm-') ||
          String(prompt.name || '')
            .toLowerCase()
            .includes('community') ||
          String(prompt.name || '')
            .toLowerCase()
            .includes('instagram') ||
          String(prompt.name || '')
            .toLowerCase()
            .includes('facebook')
      ),
      tones: Object.keys(TONE_GUIDANCE),
      platforms: ['facebook', 'instagram', 'linkedin', 'x', 'story', 'newsletter', 'other'],
      contentTypes: [
        'facebook_post',
        'instagram_post',
        'linkedin_post',
        'x_post',
        'story',
        'carousel',
        'educational',
        'promotional',
        'seasonal',
        'product_launch',
        'announcement',
        'testimonial',
        'tips',
        'quote',
        'cta_post',
        'newsletter',
        'campaign',
      ],
      governance: {
        autoPublish: false,
        socialApiConnected: false,
        requiresHumanApproval: true,
      },
    };
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slugify(value) {
  return String(value || 'content')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
