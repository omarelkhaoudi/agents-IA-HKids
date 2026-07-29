import { hasMinimumRole, isWriteMethod, ROLES } from '../constants/roles.js';

const ADMIN_PREFIX = '/admin';
const AI_PREFIX = '/ai';
const FEEDBACK_PREFIX = '/feedback';
const WORKFLOW_SUFFIX = '/workflow';
const DOCUMENTS_PREFIX = '/documents';
const KNOWLEDGE_PREFIX = '/knowledge';
const PROMPTS_PREFIX = '/prompts';
const PROMPT_PLATFORM_PREFIX = '/prompt-platform';
const DMS_PREFIX = '/dms';
const CONVERSATIONS_PREFIX = '/conversations';
const ASSISTANT_PREFIX = '/assistant';
const RETRIEVAL_PREFIX = '/retrieval';
const COMMUNITY_MANAGER_PREFIX = '/community-manager';
const SALES_AGENT_PREFIX = '/sales-agent';
const HR_AGENT_PREFIX = '/hr-agent';

function getPath(request) {
  const fullPath = request.originalUrl || request.url || request.path || '';
  const apiIndex = fullPath.indexOf('/api');

  if (apiIndex >= 0) {
    return fullPath.slice(apiIndex + 4).split('?')[0] || '/';
  }

  return fullPath.split('?')[0] || '/';
}

function deny(response, message = 'You do not have permission to perform this action.') {
  response.status(403).json({ message });
}

export function authorizeAccess(request, response, next) {
  const path = getPath(request);
  const method = request.method;
  const role = request.user?.role;
  const writeRequest = isWriteMethod(method);

  if (!role) {
    response.status(401).json({ message: 'Authentication required.' });
    return;
  }

  if (path.startsWith(ADMIN_PREFIX)) {
    if (!hasMinimumRole(role, ROLES.MANAGER)) {
      deny(response);
      return;
    }

    if (writeRequest && !hasMinimumRole(role, ROLES.ADMINISTRATOR)) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(AI_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.ADMINISTRATOR)) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(FEEDBACK_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.includes(WORKFLOW_SUFFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(DOCUMENTS_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(KNOWLEDGE_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    if (
      writeRequest &&
      (path.includes('/publish') ||
        path.includes('/archive') ||
        path.includes('/bulk') ||
        path.includes('/import') ||
        path.includes('/tags/merge') ||
        path.includes('/collections')) &&
      !hasMinimumRole(role, ROLES.MANAGER)
    ) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(PROMPTS_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.ADMINISTRATOR)) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(PROMPT_PLATFORM_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    if (
      writeRequest &&
      (path.includes('/publish') ||
        path.includes('/approve') ||
        path.includes('/archive') ||
        path.includes('/deprecate') ||
        path.includes('/libraries') ||
        path.includes('/playground')) &&
      !hasMinimumRole(role, ROLES.MANAGER)
    ) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(DMS_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    if (
      writeRequest &&
      (path.includes('/publish') ||
        path.includes('/approve') ||
        path.includes('/archive') ||
        path.includes('/import') ||
        path.includes('/folders')) &&
      !hasMinimumRole(role, ROLES.MANAGER)
    ) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(CONVERSATIONS_PREFIX) || path.startsWith(ASSISTANT_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(RETRIEVAL_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(COMMUNITY_MANAGER_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    if (
      writeRequest &&
      (path.includes('/approve') ||
        path.includes('/reject') ||
        path.includes('/guidelines') ||
        path.includes('/library')) &&
      !hasMinimumRole(role, ROLES.MANAGER)
    ) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(SALES_AGENT_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    if (
      writeRequest &&
      (path.includes('/approve') || path.includes('/reject')) &&
      !hasMinimumRole(role, ROLES.MANAGER)
    ) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (path.startsWith(HR_AGENT_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.EMPLOYEE)) {
      deny(response);
      return;
    }

    if (
      writeRequest &&
      (path.includes('/approve') ||
        path.includes('/reject') ||
        path.includes('/decide')) &&
      !hasMinimumRole(role, ROLES.MANAGER)
    ) {
      deny(response);
      return;
    }

    next();
    return;
  }

  if (writeRequest && role === ROLES.READ_ONLY) {
    deny(response);
    return;
  }

  next();
}

export function authorizeRoles(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user) {
      response.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      deny(response);
      return;
    }

    next();
  };
}
