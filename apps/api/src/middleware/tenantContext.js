import {
  normalizeTenantContext,
  runWithTenantContext,
  tenantContextFromUser,
} from '../services/security/TenantContext.js';

export function tenantContextMiddleware(request, _response, next) {
  const base = tenantContextFromUser(request.user || {});
  const requestedTenant = request.get('x-tenant-id');
  const requestedOrganization = request.get('x-organization-id');
  const canSwitchTenant = ['super_admin', 'administrator'].includes(request.user?.role);

  const context = normalizeTenantContext({
    ...base,
    tenantId: canSwitchTenant && requestedTenant ? requestedTenant : base.tenantId,
    organizationId:
      canSwitchTenant && requestedOrganization ? requestedOrganization : base.organizationId,
    bypassTenant: request.user?.role === 'super_admin' && request.get('x-tenant-bypass') === 'true',
  });

  request.tenant = context;
  runWithTenantContext(context, next);
}
