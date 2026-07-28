import { TokenService } from '../services/auth/TokenService.js';

const tokenService = new TokenService();

export function authenticate(request, response, next) {
  const authorization = request.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    response.status(401).json({ message: 'Authentication required.' });
    return;
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
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
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      };
    } catch {
      // Ignore invalid optional tokens.
    }
  }

  next();
}
