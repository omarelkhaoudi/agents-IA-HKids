export class SecurityAuditService {
  constructor({ securityRepository, observabilityService = null }) {
    this.securityRepository = securityRepository;
    this.observabilityService = observabilityService;
  }

  setObservabilityService(observabilityService) {
    this.observabilityService = observabilityService;
  }

  async record(payload = {}) {
    const user = payload.user || {};
    const tenant = payload.tenant || {};
    const allowed = payload.allowed !== false;
    const eventType = payload.eventType || (allowed ? 'security_action' : 'permission_denied');
    const severity = payload.severity || (allowed ? 'info' : 'warning');
    const normalized = {
      eventType,
      severity,
      actorUserId: payload.actorUserId || user.id || null,
      actorEmail: payload.actorEmail || user.email || '',
      tenantId: payload.tenantId || tenant.tenantId || user.tenantId || 'default-tenant',
      organizationId:
        payload.organizationId ||
        tenant.organizationId ||
        user.organizationId ||
        'default-organization',
      subjectType: payload.subjectType || '',
      subjectId: payload.subjectId || null,
      action: payload.action || '',
      allowed,
      reason: payload.reason || '',
      ipAddress: payload.ipAddress || '',
      userAgent: payload.userAgent || '',
      metadata: payload.metadata || {},
    };

    const id = await this.securityRepository.recordSecurityEvent(normalized);

    if (this.observabilityService) {
      await this.observabilityService.recordEvent({
        eventType,
        category: 'security',
        severity,
        source: 'security',
        actor: normalized.actorEmail || normalized.actorUserId || 'system',
        subjectType: normalized.subjectType,
        subjectId: normalized.subjectId,
        summary:
          payload.summary ||
          `${normalized.action || eventType} ${allowed ? 'allowed' : 'denied'}${
            normalized.reason ? `: ${normalized.reason}` : ''
          }`,
        metadata: {
          eventId: id,
          allowed,
          tenantId: normalized.tenantId,
          organizationId: normalized.organizationId,
          ...normalized.metadata,
        },
      });
    }

    return { id, ...normalized };
  }
}
