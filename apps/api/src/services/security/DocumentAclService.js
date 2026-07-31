import { hasMinimumRole, ROLES } from '../../constants/roles.js';
import { tenantColumnsForInsert } from './TenantContext.js';

const ACTION_ORDER = ['read', 'write', 'approve', 'export', 'delete', 'owner'];

function actionRank(action) {
  return ACTION_ORDER.indexOf(action);
}

function normalizeAction(action) {
  const value = String(action || 'read').toLowerCase();
  if (value === 'download') return 'export';
  if (value === 'update' || value === 'create') return 'write';
  return value;
}

function entryAllows(entry, action) {
  const normalized = normalizeAction(action);
  const permissions = Array.isArray(entry.permissions) ? entry.permissions : [];
  if (permissions.includes(normalized) || permissions.includes('owner')) {
    return true;
  }
  return actionRank(entry.accessLevel) >= actionRank(normalized);
}

function principalMatches(entry, user = {}, tenant = {}) {
  if (entry.expiresAt && new Date(entry.expiresAt).getTime() < Date.now()) {
    return false;
  }

  if (entry.principalType === 'user') {
    return [user.id, user.email].filter(Boolean).includes(entry.principalId);
  }

  if (entry.principalType === 'role') {
    return entry.principalId === user.role;
  }

  if (entry.principalType === 'organization') {
    return entry.principalId === (tenant.organizationId || user.organizationId);
  }

  if (entry.principalType === 'team') {
    return entry.principalId === user.teamId || entry.principalId === user.department;
  }

  return false;
}

function ownsDocument(user = {}, document = {}) {
  return [document.ownerId, document.owner, document.author, document.createdBy]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .some((value) =>
      [user.id, user.email, user.name]
        .filter(Boolean)
        .map((candidate) => String(candidate).toLowerCase())
        .includes(value)
    );
}

export class DocumentAclService {
  constructor({ securityRepository, auditService }) {
    this.securityRepository = securityRepository;
    this.auditService = auditService;
  }

  async getEffectiveAcl(document = {}) {
    const [documentEntries, folderEntries] = await Promise.all([
      this.securityRepository.listDocumentAclEntries({ documentId: document.id }),
      document.folderId && document.aclInherits !== false
        ? this.securityRepository.listDocumentAclEntries({ folderId: document.folderId })
        : Promise.resolve([]),
    ]);

    return [
      ...documentEntries,
      ...folderEntries.map((entry) => ({ ...entry, inherited: true })),
    ];
  }

  async evaluate({ user = {}, tenant = {}, document = {}, action = 'read' } = {}) {
    const normalizedAction = normalizeAction(action);
    const visibility = document.aclVisibility || 'organization';
    const isAdmin = hasMinimumRole(user.role, ROLES.ADMINISTRATOR);
    const isOwner = ownsDocument(user, document);
    const sameOrganization =
      !document.organizationId ||
      document.organizationId === (tenant.organizationId || user.organizationId);
    const sameTenant =
      user.role === ROLES.SUPER_ADMIN ||
      !document.tenantId ||
      document.tenantId === (tenant.tenantId || user.tenantId);

    if (!sameTenant) {
      return { allowed: false, reason: 'tenant_violation', visibility, isOwner };
    }

    if (isAdmin || isOwner) {
      return { allowed: true, reason: isOwner ? 'document_owner' : 'administrator', visibility, isOwner };
    }

    const entries = await this.getEffectiveAcl(document);
    const explicit = entries.find(
      (entry) => principalMatches(entry, user, tenant) && entryAllows(entry, normalizedAction)
    );

    if (explicit) {
      return {
        allowed: true,
        reason: explicit.inherited ? 'inherited_acl' : 'explicit_acl',
        visibility,
        isOwner,
        aclEntryId: explicit.id,
      };
    }

    if (visibility === 'organization' && sameOrganization && normalizedAction === 'read') {
      return { allowed: true, reason: 'organization_visibility', visibility, isOwner };
    }

    if (
      visibility === 'team' &&
      sameOrganization &&
      hasMinimumRole(user.role, ROLES.EMPLOYEE) &&
      ['read', 'write'].includes(normalizedAction)
    ) {
      return { allowed: true, reason: 'team_visibility', visibility, isOwner };
    }

    if (visibility === 'private') {
      return { allowed: false, reason: 'private_document', visibility, isOwner };
    }

    if (visibility === 'restricted') {
      return { allowed: false, reason: 'restricted_document', visibility, isOwner };
    }

    return { allowed: false, reason: `acl_denied_${normalizedAction}`, visibility, isOwner };
  }

  async ensureAccess(input = {}) {
    const decision = await this.evaluate(input);

    await this.auditService.record({
      user: input.user,
      tenant: input.tenant,
      eventType: decision.allowed ? 'document_access' : 'permission_denied',
      severity: decision.allowed ? 'info' : 'warning',
      subjectType: 'document',
      subjectId: input.document?.id,
      action: normalizeAction(input.action),
      allowed: decision.allowed,
      reason: decision.reason,
      metadata: {
        visibility: decision.visibility,
        isOwner: decision.isOwner,
        aclEntryId: decision.aclEntryId || null,
      },
    });

    if (!decision.allowed) {
      const error = new Error('You do not have permission to access this document.');
      error.statusCode = 403;
      error.code = decision.reason;
      throw error;
    }

    return decision;
  }

  async shareDocument(document, payload = {}, actor = {}) {
    const tenantValues = tenantColumnsForInsert({
      tenantId: document.tenantId,
      organizationId: document.organizationId,
      ownerId: actor.id || actor.email || document.ownerId,
    });
    const entry = await this.securityRepository.addDocumentAclEntry({
      documentId: document.id,
      principalType: payload.principalType,
      principalId: payload.principalId,
      accessLevel: payload.accessLevel || 'read',
      permissions: payload.permissions || [payload.accessLevel || 'read'],
      expiresAt: payload.expiresAt || null,
      createdBy: actor.email || actor.id || '',
      ...tenantValues,
    });

    await this.auditService.record({
      user: actor,
      eventType: 'acl_modified',
      subjectType: 'document',
      subjectId: document.id,
      action: 'share',
      allowed: true,
      reason: 'acl_entry_added',
      metadata: { aclEntryId: entry.id, principalType: entry.principalType },
    });

    return entry;
  }

  removeAclEntry(id, actor = {}) {
    return this.securityRepository.removeDocumentAclEntry(id).then(async (removed) => {
      if (removed) {
        await this.auditService.record({
          user: actor,
          eventType: 'acl_modified',
          subjectType: 'document_acl',
          subjectId: id,
          action: 'delete',
          allowed: true,
          reason: 'acl_entry_removed',
        });
      }
      return { removed, id };
    });
  }
}
