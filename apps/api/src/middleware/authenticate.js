import { TokenService } from '../services/auth/TokenService.js';
import { authService } from '../runtime/auth-runtime.js';

const tokenService = new TokenService();

function mapUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    tokenVersion: user.tokenVersion,
    tenantId: user.tenantId || 'default-tenant',
    organizationId: user.organizationId || 'default-organization',
  };
}

export async function authenticate(request, response, next) {
  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    response.status(401).json({ message: 'Authentication required.' });
    return;
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    const user = await authService.validateAccessPayload(payload);
    request.user = mapUser(user);
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      response.status(401).json({ message: 'Access token has expired.', code: 'TOKEN_EXPIRED' });
      return;
    }

    response.status(401).json({ message: 'Invalid access token.' });
  }
}

export async function optionalAuthenticate(request, _response, next) {
  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = tokenService.verifyAccessToken(token);
      const user = await authService.validateAccessPayload(payload);
      request.user = mapUser(user);
    } catch {
      // Ignore invalid optional tokens.
    }
  }

  next();
}
