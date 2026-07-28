import { hasMinimumRole, isWriteMethod, ROLES } from '../constants/roles.js';

const ADMIN_PREFIX = '/admin';
const AI_PREFIX = '/ai';
const FEEDBACK_PREFIX = '/feedback';
const WORKFLOW_SUFFIX = '/workflow';
const DOCUMENTS_PREFIX = '/documents';
const PROMPTS_PREFIX = '/prompts';
const CONVERSATIONS_PREFIX = '/conversations';
const ASSISTANT_PREFIX = '/assistant';
const RETRIEVAL_PREFIX = '/retrieval';

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

  if (path.startsWith(PROMPTS_PREFIX)) {
    if (writeRequest && !hasMinimumRole(role, ROLES.ADMINISTRATOR)) {
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
