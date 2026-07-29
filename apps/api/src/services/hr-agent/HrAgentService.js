const DOCUMENT_TYPES = [
  'job_description',
  'employment_contract',
  'internship_agreement',
  'freelance_contract',
  'probation_confirmation',
  'contract_amendment',
  'employment_certificate',
  'salary_certificate',
  'administrative_letter',
  'warning_letter',
  'explanation_request',
  'meeting_invitation',
  'disciplinary_report',
  'administrative_notice',
  'performance_review',
  'training_plan',
  'onboarding_plan',
  'offboarding_plan',
  'offer_letter',
  'rejection_letter',
  'interview_summary',
  'recruitment_summary',
  'hr_report',
  'internal_communication',
  'other',
];

const DEFAULT_EMPLOYEES = [
  {
    fullName: 'Sara Benali',
    email: 'sara.benali@hkids.ma',
    phone: '+212 6 11 00 00 01',
    department: 'Pédagogie',
    position: 'Coordinatrice pédagogique',
    managerName: 'Direction H-Kids',
    employmentType: 'full_time',
    status: 'active',
    tags: ['demo'],
    notes: 'Profil de démonstration — aucune action RH automatique.',
  },
  {
    fullName: 'Youssef Amrani',
    email: 'youssef.amrani@hkids.ma',
    phone: '+212 6 11 00 00 02',
    department: 'Administration',
    position: 'Assistant administratif',
    managerName: 'Direction H-Kids',
    employmentType: 'full_time',
    status: 'active',
    tags: ['demo'],
    notes: 'Profil de démonstration.',
  },
];

function safeParseJson(text, fallback) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return fallback;
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
  return String(value || 'hr-document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export class HrAgentService {
  constructor({ repository, aiGateway, retrievalService, listDocuments, listPrompts }) {
    this.repository = repository;
    this.aiGateway = aiGateway;
    this.retrievalService = retrievalService;
    this.listDocuments = listDocuments;
    this.listPrompts = listPrompts;
  }

  async initialize() {
    const employees = await this.repository.listEmployees();
    if (!employees.length) {
      for (const employee of DEFAULT_EMPLOYEES) {
        await this.repository.createEmployee(employee);
      }
    }
  }

  buildSystemPrompt() {
    return [
      'You are the HR Agent AI for H-Kids.',
      'You ONLY prepare HR drafts for human validation by managers.',
      'Never hire, fire, approve leave, issue sanctions, modify salaries, sign contracts, or send emails.',
      'Never communicate with candidates automatically.',
      'Always retrieve and use knowledge context before answering.',
      'Always explain reasoning briefly and cite knowledge when relevant.',
      'Respond ONLY with valid JSON.',
    ].join('\n');
  }

  filterHrPrompts(prompts = []) {
    return prompts.filter(
      (prompt) =>
        prompt.promptGroupId?.startsWith('hr-') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('hr') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('recruit') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('onboarding') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('performance')
    );
  }

  filterHrKnowledge(documents = []) {
    return documents.filter((document) => {
      const category = String(document.category || '').toLowerCase();
      const tags = (document.tags || []).map((tag) => String(tag).toLowerCase());
      return (
        category.includes('hr') ||
        category.includes('rh') ||
        category.includes('policy') ||
        category.includes('handbook') ||
        tags.some((tag) =>
          ['hr', 'rh', 'policy', 'recruitment', 'leave', 'contract', 'onboarding'].includes(tag)
        )
      );
    });
  }

  async generateDocument(payload = {}, userId) {
    const documentType = DOCUMENT_TYPES.includes(payload.documentType)
      ? payload.documentType
      : 'other';
    const instruction =
      payload.instruction ||
      payload.title ||
      `Prepare a ${documentType.replaceAll('_', ' ')} draft for H-Kids HR.`;
    const retrieval = this.retrievalService.retrieveRelevantContext(instruction);
    const prompts = this.filterHrPrompts(this.listPrompts());
    const selectedPrompt = prompts.find((prompt) => prompt.id === payload.promptId) || prompts[0];

    const userMessage = [
      `Document type: ${documentType}`,
      `Employee: ${payload.employeeName || 'N/A'}`,
      `Candidate: ${payload.candidateName || 'N/A'}`,
      `Department: ${payload.department || 'N/A'}`,
      `Instruction: ${instruction}`,
      selectedPrompt
        ? `Prompt template: ${selectedPrompt.name} — ${selectedPrompt.objective}`
        : '',
      `Knowledge context:\n${retrieval.contextText || retrieval.context || 'None'}`,
      'Return JSON keys: title, body, reasoning, knowledgeCitations, checklist, recommendations, risks.',
      'knowledgeCitations must be an array of short citations from knowledge when available.',
      'Remind that manager approval is mandatory and no legal action is taken automatically.',
    ]
      .filter(Boolean)
      .join('\n');

    const generation = await this.aiGateway.generate({
      provider: payload.provider,
      model: payload.model,
      systemPrompt: this.buildSystemPrompt(),
      messages: [{ role: 'user', content: userMessage }],
      userId,
      agentCode: 'hr-agent',
      conversationId: payload.conversationId,
    });

    const parsed = safeParseJson(generation.text, {
      title: payload.title || `Draft ${documentType}`,
      body: generation.text || 'HR draft ready for human review.',
      reasoning: 'Prepared as a draft only.',
      knowledgeCitations: [],
      checklist: [],
      recommendations: [],
      risks: ['Requires manager validation before any action.'],
    });

    const document = await this.repository.createDocument({
      employeeId: payload.employeeId || null,
      candidateId: payload.candidateId || null,
      documentType,
      title: parsed.title || payload.title || `Draft ${documentType}`,
      body: parsed.body || '',
      approvalStatus: 'draft',
      sourcePrompt: selectedPrompt?.name || instruction,
      conversationId: payload.conversationId || null,
      metadata: {
        reasoning: parsed.reasoning || '',
        knowledgeCitations: parsed.knowledgeCitations || [],
        checklist: parsed.checklist || [],
        recommendations: parsed.recommendations || [],
        risks: parsed.risks || [],
        usageId: generation.usage?.id,
        model: generation.model || generation.usage?.model,
        retrievalChunks: retrieval.rankedChunks?.length || 0,
        governance: {
          neverHire: true,
          neverFire: true,
          neverApproveLeave: true,
          neverSanction: true,
          neverModifySalary: true,
          neverSignContract: true,
          neverSendEmail: true,
          requiresHumanApproval: true,
        },
      },
    });

    return { document, retrieval, generation, parsed };
  }

  async generateJobDescription(payload = {}, userId) {
    const instruction =
      payload.instruction ||
      `Prepare a job description for ${payload.title || 'a H-Kids role'} in ${payload.department || 'operations'}.`;
    const retrieval = this.retrievalService.retrieveRelevantContext(instruction);
    const prompts = this.filterHrPrompts(this.listPrompts());
    const selectedPrompt =
      prompts.find((prompt) => prompt.promptGroupId === 'hr-job-description') || prompts[0];

    const generation = await this.aiGateway.generate({
      provider: payload.provider,
      model: payload.model,
      systemPrompt: this.buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            `Create a job description draft.`,
            `Title: ${payload.title || 'Poste H-Kids'}`,
            `Department: ${payload.department || ''}`,
            `Location: ${payload.location || 'Casablanca'}`,
            `Contract type: ${payload.contractType || 'full_time'}`,
            `Instruction: ${instruction}`,
            selectedPrompt
              ? `Prompt template: ${selectedPrompt.name} — ${selectedPrompt.objective}`
              : '',
            `Knowledge:\n${retrieval.contextText || retrieval.context || 'None'}`,
            'Return JSON keys: title, mission, responsibilities, dailyTasks, requiredSkills, preferredSkills, experience, education, softSkills, languages, benefits, body, reasoning.',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      userId,
      agentCode: 'hr-agent',
      conversationId: payload.conversationId,
    });

    const parsed = safeParseJson(generation.text, {
      title: payload.title || 'Fiche de poste H-Kids',
      mission: '',
      responsibilities: [],
      dailyTasks: [],
      requiredSkills: [],
      preferredSkills: [],
      experience: '',
      education: '',
      softSkills: [],
      languages: [],
      benefits: [],
      body: generation.text || 'Job description draft.',
      reasoning: 'Draft only — manager validation required.',
    });

    const job = await this.repository.createJobDescription({
      title: parsed.title || payload.title || 'Fiche de poste',
      department: payload.department || '',
      location: payload.location || '',
      contractType: payload.contractType || 'full_time',
      mission: parsed.mission || '',
      responsibilities: parsed.responsibilities || [],
      dailyTasks: parsed.dailyTasks || [],
      requiredSkills: parsed.requiredSkills || [],
      preferredSkills: parsed.preferredSkills || [],
      experience: parsed.experience || '',
      education: parsed.education || '',
      softSkills: parsed.softSkills || [],
      languages: parsed.languages || [],
      benefits: parsed.benefits || [],
      body: parsed.body || '',
      approvalStatus: 'draft',
      metadata: {
        reasoning: parsed.reasoning || '',
        retrievalChunks: retrieval.rankedChunks?.length || 0,
        usageId: generation.usage?.id,
      },
    });

    return { job, retrieval, generation, parsed };
  }

  async recommendLeave(payload = {}, userId) {
    const instruction =
      payload.instruction ||
      `Recommend whether leave can be considered for ${payload.employeeName || 'employee'} (${payload.leaveType || 'annual'}).`;
    const retrieval = this.retrievalService.retrieveRelevantContext(instruction);

    const generation = await this.aiGateway.generate({
      provider: payload.provider,
      model: payload.model,
      systemPrompt: this.buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            'Prepare a leave recommendation for a manager. Do NOT approve or reject.',
            `Employee: ${payload.employeeName || ''}`,
            `Leave type: ${payload.leaveType || 'annual'}`,
            `Days: ${payload.days ?? 1}`,
            `Reason: ${payload.reason || ''}`,
            `Knowledge:\n${retrieval.contextText || retrieval.context || 'None'}`,
            'Return JSON keys: recommendation, reasoning, risks, checklist.',
          ].join('\n'),
        },
      ],
      userId,
      agentCode: 'hr-agent',
      conversationId: payload.conversationId,
    });

    const parsed = safeParseJson(generation.text, {
      recommendation: 'Manager decision required. AI recommendation only.',
      reasoning: generation.text || '',
      risks: [],
      checklist: ['Verify balance', 'Confirm coverage', 'Manager decision'],
    });

    const leave = await this.repository.createLeaveRequest({
      employeeId: payload.employeeId || null,
      employeeName: payload.employeeName || '',
      leaveType: payload.leaveType || 'annual',
      startDate: payload.startDate || null,
      endDate: payload.endDate || null,
      days: payload.days ?? 1,
      reason: payload.reason || '',
      status: 'pending',
      aiRecommendation: parsed.recommendation || '',
      managerDecision: '',
      metadata: {
        reasoning: parsed.reasoning || '',
        risks: parsed.risks || [],
        checklist: parsed.checklist || [],
        retrievalChunks: retrieval.rankedChunks?.length || 0,
        neverAutoApprove: true,
      },
    });

    return { leave, retrieval, generation, parsed };
  }

  async submitDocumentReview(id) {
    return this.repository.updateDocument(id, { approvalStatus: 'pending_review' });
  }

  async approveDocument(id, actor = 'reviewer') {
    const existing = await this.repository.getDocument(id);
    return this.repository.updateDocument(id, {
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: actor,
      version: (existing?.version || 1) + 0,
    });
  }

  async rejectDocument(id, actor = 'reviewer') {
    return this.repository.updateDocument(id, {
      approvalStatus: 'rejected',
      approvedBy: actor,
    });
  }

  async submitJobReview(id) {
    return this.repository.updateJobDescription(id, { approvalStatus: 'pending_review' });
  }

  async approveJob(id, actor = 'reviewer') {
    return this.repository.updateJobDescription(id, {
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: actor,
    });
  }

  async rejectJob(id, actor = 'reviewer') {
    return this.repository.updateJobDescription(id, {
      approvalStatus: 'rejected',
      approvedBy: actor,
    });
  }

  async decideLeave(id, decision, actor = 'manager') {
    if (!['approved', 'rejected'].includes(decision)) {
      throw Object.assign(new Error('Leave decision must be approved or rejected by a manager.'), {
        statusCode: 400,
      });
    }
    return this.repository.updateLeaveRequest(id, {
      status: decision,
      managerDecision: `${decision} by ${actor}`,
    });
  }

  async exportDocument(id, format = 'markdown') {
    const document = await this.repository.getDocument(id);
    if (!document) {
      throw Object.assign(new Error('Document not found.'), { statusCode: 404 });
    }

    if (!['approved', 'exported'].includes(document.approvalStatus)) {
      throw Object.assign(
        new Error('Document must be approved before export. Never send automatically.'),
        { statusCode: 409 }
      );
    }

    const markdown = [
      `# ${document.title}`,
      '',
      `Type: ${document.documentType}`,
      `Version: ${document.version}`,
      '',
      document.body,
      '',
      document.metadata?.reasoning ? `## Reasoning\n${document.metadata.reasoning}` : '',
      document.metadata?.knowledgeCitations?.length
        ? `## Knowledge citations\n${document.metadata.knowledgeCitations.map((item) => `- ${item}`).join('\n')}`
        : '',
      '',
      '_Prepared by HR Agent AI — human validation required. Never hired, fired, sanctioned, or emailed automatically._',
    ]
      .filter(Boolean)
      .join('\n');

    await this.repository.updateDocument(id, { approvalStatus: 'exported' });

    if (format === 'html') {
      return {
        contentType: 'text/html; charset=utf-8',
        filename: `${slugify(document.title)}.html`,
        body: `<article><h1>${escapeHtml(document.title)}</h1><p>${escapeHtml(document.body).replace(/\n/g, '<br/>')}</p><p><em>Draft prepared for human validation.</em></p></article>`,
      };
    }

    if (format === 'csv') {
      const csv = [
        'title,document_type,approval_status,version',
        `"${document.title.replaceAll('"', '""')}","${document.documentType}","${document.approvalStatus}",${document.version}`,
      ].join('\n');
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${slugify(document.title)}.csv`,
        body: csv,
      };
    }

    return {
      contentType: 'text/markdown; charset=utf-8',
      filename: `${slugify(document.title)}.md`,
      body: markdown,
    };
  }

  getAnalytics({ employees = [], candidates = [], leave = [], documents = [], absences = [] } = {}) {
    const stageCounts = {};
    for (const candidate of candidates) {
      stageCounts[candidate.stage] = (stageCounts[candidate.stage] || 0) + 1;
    }

    const docTypes = {};
    for (const document of documents) {
      docTypes[document.documentType] = (docTypes[document.documentType] || 0) + 1;
    }

    return {
      recruitmentFunnel: Object.entries(stageCounts).map(([stage, total]) => ({ stage, total })),
      documentTypes: Object.entries(docTypes)
        .map(([type, total]) => ({ type, total }))
        .sort((a, b) => b.total - a.total),
      leaveByStatus: ['pending', 'approved', 'rejected'].map((status) => ({
        status,
        total: leave.filter((item) => item.status === status).length,
      })),
      absenceAlerts: absences.filter((item) => item.alertFlag).length,
      knowledgeUsage: documents.reduce(
        (sum, document) => sum + Number(document.metadata?.retrievalChunks || 0),
        0
      ),
      promptUsage: documents.filter((document) => document.sourcePrompt).length,
      employees: employees.length,
      feedbackHint: 'Reuse Feedback Engine from generated conversations and documents',
    };
  }

  async getWorkspaceBootstrap() {
    const [
      employees,
      candidates,
      jobs,
      leave,
      absences,
      documents,
      stats,
      allDocuments,
      prompts,
    ] = await Promise.all([
      this.repository.listEmployees(),
      this.repository.listCandidates(),
      this.repository.listJobDescriptions(),
      this.repository.listLeaveRequests(),
      this.repository.listAbsences(),
      this.repository.listDocuments(),
      this.repository.getDashboardStats(),
      Promise.resolve(this.listDocuments()),
      Promise.resolve(this.listPrompts()),
    ]);

    return {
      agentCode: 'hr-agent',
      employees,
      candidates,
      jobDescriptions: jobs,
      leaveRequests: leave,
      absences,
      documents,
      stats,
      analytics: this.getAnalytics({ employees, candidates, leave, documents, absences }),
      knowledgeDocuments: this.filterHrKnowledge(allDocuments),
      prompts: this.filterHrPrompts(prompts),
      documentTypes: DOCUMENT_TYPES,
      leaveTypes: ['annual', 'paid', 'unpaid', 'medical', 'remote', 'exceptional', 'parental'],
      recruitmentStages: [
        'applied',
        'screening',
        'interview',
        'shortlist',
        'offer',
        'hired',
        'rejected',
        'withdrawn',
      ],
      governance: {
        autoHire: false,
        autoFire: false,
        autoLeaveApproval: false,
        autoSanction: false,
        autoSalaryChange: false,
        autoContractSign: false,
        autoEmail: false,
        requiresHumanApproval: true,
        banner:
          'HR Agent prepares drafts only. Managers approve. Never hire, fire, sanction, modify salaries, sign contracts, or send emails automatically.',
      },
    };
  }
}

export { DOCUMENT_TYPES };
