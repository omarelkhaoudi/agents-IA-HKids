export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMINISTRATOR: 'administrator',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  READ_ONLY: 'read_only',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMINISTRATOR]: 'Administrator',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.EMPLOYEE]: 'Employee',
  [ROLES.READ_ONLY]: 'Read Only',
};

const ROLE_RANK = {
  [ROLES.SUPER_ADMIN]: 5,
  [ROLES.ADMINISTRATOR]: 4,
  [ROLES.MANAGER]: 3,
  [ROLES.EMPLOYEE]: 2,
  [ROLES.READ_ONLY]: 1,
};

export const ALL_ROLES = Object.values(ROLES);

export function hasMinimumRole(userRole, requiredRole) {
  const userRank = ROLE_RANK[userRole] || 0;
  const requiredRank = ROLE_RANK[requiredRole] || 0;
  return userRank >= requiredRank;
}

export function isWriteMethod(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}
