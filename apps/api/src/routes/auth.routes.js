import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { authService } from '../runtime/auth-runtime.js';
import { loginBodySchema, logoutBodySchema, refreshTokenBodySchema } from '../validation/schemas.js';

const authRouter = Router();

authRouter.post('/auth/login', authRateLimiter, validate({ body: loginBodySchema }), async (request, response) => {
  try {
    const result = await authService.login({
      email: request.body?.email,
      password: request.body?.password,
    });
    response.json(result);
  } catch (error) {
    response.status(401).json({
      message: error instanceof Error ? error.message : 'Unable to sign in.',
    });
  }
});

authRouter.post('/auth/refresh', authRateLimiter, validate({ body: refreshTokenBodySchema }), async (request, response) => {
  try {
    const result = await authService.refresh(request.body?.refreshToken);
    response.json(result);
  } catch (error) {
    response.status(401).json({
      message: error instanceof Error ? error.message : 'Unable to refresh session.',
    });
  }
});

authRouter.post('/auth/logout', validate({ body: logoutBodySchema }), async (request, response) => {
  try {
    const result = await authService.logout(request.body?.refreshToken);
    response.json(result);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to sign out.',
    });
  }
});

authRouter.post('/auth/logout-all', authenticate, async (request, response) => {
  try {
    const result = await authService.logoutAll(request.user.id);
    response.json(result);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to sign out from all devices.',
    });
  }
});

authRouter.get('/auth/me', authenticate, async (request, response) => {
  try {
    const user = await authService.getCurrentUser(request.user.id);
    response.json({ user });
  } catch (error) {
    response.status(401).json({
      message: error instanceof Error ? error.message : 'Unable to load current user.',
    });
  }
});

export default authRouter;
