import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export class TokenService {
  constructor() {
    this.accessTokenTtl = env.jwtAccessExpiresIn;
    this.refreshTokenTtlMs = env.jwtRefreshExpiresInMs;
  }

  signAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      env.jwtSecret,
      {
        expiresIn: this.accessTokenTtl,
      }
    );
  }

  verifyAccessToken(token) {
    return jwt.verify(token, env.jwtSecret);
  }

  generateRefreshToken() {
    return crypto.randomBytes(48).toString('hex');
  }

  hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiry() {
    return new Date(Date.now() + this.refreshTokenTtlMs);
  }
}
