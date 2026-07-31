import { hasMinimumRole, ROLES } from '../../constants/roles.js';

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ['read', 'write', 'approve', 'export', 'delete', 'owner'],
  [ROLES.ADMINISTRATOR]: ['read', 'write', 'approve', 'export', 'delete', 'owner'],
  [ROLES.MANAGER]: ['read', 'write', 'approve', 'export'],
  [ROLES.EMPLOYEE]: ['read', 'write'],
  [ROLES.READ_ONLY]: ['read'],
};

function normalizeAction(action = 'read') {
  const value = String(action || 'read').toLowerCase();
  if (value === 'update' || value === 'create') return 'write';
  if (value === 'download') return 'export';
  return value;
}

function userOwnsObject(user = {}, object = {}) {
  const candidates = [
    object.ownerId,
    object.owner_id,
    object.owner,
    object.createdBy,
    object.created_by,
    object.author,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return [user.id, user.email, user.name]
    .filter(Boolean)
    .some((value) => candidates.includes(String(value).toLowerCase()));
}

export class ObjectAuthorizationService {
  constructor({ auditService = null } = {}) {
    this.auditService = auditService;
  }

  getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.READ_ONLY];
  }

  evaluate({ user = {}, action = 'read', object = {}, tenant = {} } = {}) {
    const normalizedAction = normalizeAction(action);
    const role = user.role || ROLES.READ_ONLY;
    const permissions = this.getRolePermissions(role);
    const isAdmin = hasMinimumRole(role, ROLES.ADMINISTRATOR);
    const isOwner = userOwnsObject(user, object);
    const objectTenant = object.tenantId || object.tenant_id || tenant.tenantId;
    const objectOrganization = object.organizationId || object.organization_id || tenant.organizationId;
    const tenantMatches =
      role === ROLES.SUPER_ADMIN ||
      (!objectTenant || objectTenant === (tenant.tenantId || user.tenantId || 'default-tenant')) &&
        (!objectOrganization ||
          objectOrganization ===
            (tenant.organizationId || user.organizationId || 'default-organization'));

    if (!tenantMatches) {
      return {
        allowed: false,
        reason: 'tenant_violation',
        permissions,
        isOwner,
        tenantMatches,
      };
    }

    if (permissions.includes(normalizedAction)) {
      return { allowed: true, reason: 'role_permission', permissions, isOwner, tenantMatches };
    }

    if (isOwner && ['read', 'write', 'export', 'owner'].includes(normalizedAction)) {
      return { allowed: true, reason: 'owner_permission', permissions, isOwner, tenantMatches };
    }

    if (isAdmin) {
      return { allowed: true, reason: 'administrator_override', permissions, isOwner, tenantMatches };
    }

    return {
      allowed: false,
      reason: `missing_${normalizedAction}_permission`,
      permissions,
      isOwner,
      tenantMatches,
    };
  }

  async ensureAuthorized(input = {}) {
    const decision = this.evaluate(input);

    if (this.auditService) {
      await this.auditService.record({
        user: input.user,
        tenant: input.tenant,
        eventType: decision.allowed ? 'object_access_allowed' : 'permission_denied',
        severity: decision.allowed ? 'info' : 'warning',
        subjectType: input.subjectType || input.object?.type || 'object',
        subjectId: input.subjectId || input.object?.id,
        action: normalizeAction(input.action),
        allowed: decision.allowed,
        reason: decision.reason,
        metadata: {
          permissions: decision.permissions,
          isOwner: decision.isOwner,
          tenantMatches: decision.tenantMatches,
        },
      });
    }

    if (!decision.allowed) {
      const error = new Error('You do not have permission to access this object.');
      error.statusCode = decision.reason === 'tenant_violation' ? 403 : 403;
      error.code = decision.reason;
      throw error;
    }

    return decision;
  }
}
