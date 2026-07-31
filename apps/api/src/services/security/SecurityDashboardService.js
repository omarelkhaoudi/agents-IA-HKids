function scoreFromViolations(total, violations) {
  if (total <= 0) return 100;
  return Math.max(0, Math.round(100 - (violations / total) * 100));
}

export class SecurityDashboardService {
  constructor({
    securityRepository,
    secretManager,
    encryptionService,
    alertService = null,
  }) {
    this.securityRepository = securityRepository;
    this.secretManager = secretManager;
    this.encryptionService = encryptionService;
    this.alertService = alertService;
  }

  setAlertService(alertService) {
    this.alertService = alertService;
  }

  async syncSecretInventory() {
    const health = this.secretManager.getSecretHealth();
    for (const item of health.items) {
      await this.securityRepository.upsertSecretInventory({
        name: item.name,
        provider: item.provider,
        status: item.status,
        source: item.source,
        lastValidatedAt: item.lastValidatedAt,
        expiresAt: item.expiresAt,
        rotatedAt: item.rotatedAt,
        metadata: {
          configured: item.configured,
          required: item.required,
          fingerprint: item.fingerprint,
        },
      });
    }
    return health;
  }

  async syncEncryptionInventory() {
    const health = this.encryptionService.getHealth();
    await this.securityRepository.upsertEncryptionKey({
      keyId: health.keyId,
      version: health.version,
      status: health.status === 'healthy' ? 'active' : 'expired',
      algorithm: health.algorithm,
      rotatedAt: health.rotatedAt,
      metadata: { configured: health.configured },
    });
    return health;
  }

  async getDashboard() {
    const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      activeSessions,
      lockedAccounts,
      failedLogins,
      permissionViolations,
      tenantViolations,
      securityEvents,
      secretHealth,
      encryptionHealth,
      aclStatistics,
      alerts,
    ] = await Promise.all([
      this.securityRepository.listActiveSessions({ limit: 25 }),
      this.securityRepository.listLockedAccounts({ limit: 25 }),
      this.securityRepository.countSecurityEvents({ eventType: 'login_failed', since: sinceDay }),
      this.securityRepository.countSecurityEvents({ allowed: false, since: sinceDay }),
      this.securityRepository.countSecurityEvents({ eventType: 'tenant_violation', since: sinceDay }),
      this.securityRepository.listSecurityEvents({ limit: 30 }),
      this.syncSecretInventory(),
      this.syncEncryptionInventory(),
      this.securityRepository.getAclStatistics(),
      this.alertService?.listAlerts
        ? this.alertService.listAlerts({ category: 'security', limit: 10 })
        : Promise.resolve({ items: [], counts: {} }),
    ]);

    const eventCount = securityEvents.length;
    const permissionScore = scoreFromViolations(Math.max(eventCount, 1), permissionViolations);
    const tenantIsolationScore = tenantViolations > 0 ? 60 : 100;
    const secretScore =
      secretHealth.missing > 0 || secretHealth.expired > 0
        ? Math.max(0, 100 - (secretHealth.missing + secretHealth.expired) * 15)
        : 100;
    const authenticationHealth = lockedAccounts.length > 0 || failedLogins > 0 ? 85 : 100;
    const aclQuality =
      aclStatistics.restrictedDocuments > 0 && aclStatistics.entries === 0
        ? 70
        : aclStatistics.entries > 0
          ? 95
          : 85;
    const securityScore = Math.round(
      (permissionScore + tenantIsolationScore + secretScore + authenticationHealth + aclQuality) / 5
    );

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        activeSessions: activeSessions.length,
        failedLogins,
        lockedAccounts: lockedAccounts.length,
        tenantViolations,
        permissionViolations,
        securityEvents: eventCount,
        secretIssues: secretHealth.missing + secretHealth.expired,
        aclEntries: aclStatistics.entries,
      },
      scores: {
        securityScore,
        permissionScore,
        tenantIsolationScore,
        secretManagementScore: secretScore,
        authenticationHealth,
        aclQuality,
      },
      activeSessions,
      lockedAccounts,
      secretHealth,
      encryptionHealth,
      aclStatistics,
      events: securityEvents,
      alerts,
    };
  }

  async getEvaluationScore() {
    const dashboard = await this.getDashboard();
    return {
      generatedAt: dashboard.generatedAt,
      ...dashboard.scores,
      metrics: dashboard.metrics,
      evidence: {
        secretHealth: dashboard.secretHealth.items.map((item) => ({
          name: item.name,
          status: item.status,
          source: item.source,
        })),
        encryptionHealth: dashboard.encryptionHealth,
        aclStatistics: dashboard.aclStatistics,
      },
    };
  }
}
