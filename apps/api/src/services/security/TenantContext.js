import { AsyncLocalStorage } from 'node:async_hooks';
import { ROLES } from '../../constants/roles.js';

export const DEFAULT_TENANT_ID = 'default-tenant';
export const DEFAULT_ORGANIZATION_ID = 'default-organization';

const tenantStorage = new AsyncLocalStorage();

function clean(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

export function normalizeTenantContext(context = {}) {
  return {
    tenantId: clean(context.tenantId || context.tenant_id, DEFAULT_TENANT_ID),
    organizationId: clean(
      context.organizationId || context.organization_id,
      DEFAULT_ORGANIZATION_ID
    ),
    userId: clean(context.userId || context.user_id),
    email: clean(context.email),
    role: clean(context.role, ROLES.READ_ONLY),
    bypassTenant: Boolean(context.bypassTenant),
  };
}

export function tenantContextFromUser(user = {}) {
  return normalizeTenantContext({
    tenantId: user.tenantId,
    organizationId: user.organizationId,
    userId: user.id,
    email: user.email,
    role: user.role,
    bypassTenant: user.role === ROLES.SUPER_ADMIN && user.bypassTenant === true,
  });
}

export function getTenantContext() {
  return tenantStorage.getStore() || null;
}

export function getRequiredTenantContext() {
  return normalizeTenantContext(getTenantContext() || {});
}

export function runWithTenantContext(context, callback) {
  return tenantStorage.run(normalizeTenantContext(context), callback);
}

export function isTenantBypass(context = getTenantContext()) {
  return Boolean(context?.bypassTenant);
}

export function getTenantValues(payload = {}) {
  const context = normalizeTenantContext(payload);
  return {
    tenantId: context.tenantId,
    organizationId: context.organizationId,
    ownerId: clean(payload.ownerId || payload.owner_id || context.userId),
  };
}

export function appendTenantFilter(clauses, values, { alias = '', context = getTenantContext() } = {}) {
  const normalized = normalizeTenantContext(context || {});

  if (normalized.bypassTenant) {
    return;
  }

  const prefix = alias ? `${alias}.` : '';
  values.push(normalized.tenantId);
  clauses.push(`${prefix}tenant_id = $${values.length}`);
  values.push(normalized.organizationId);
  clauses.push(`${prefix}organization_id = $${values.length}`);
}

export function tenantColumnsForInsert(payload = {}) {
  const context = getRequiredTenantContext();
  return {
    tenantId: clean(payload.tenantId || payload.tenant_id, context.tenantId),
    organizationId: clean(payload.organizationId || payload.organization_id, context.organizationId),
    ownerId: clean(payload.ownerId || payload.owner_id, context.userId),
  };
}
