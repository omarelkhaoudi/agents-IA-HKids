import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { SECRET_NAMES, secretManager } from '../security/SecretManager.js';

export class TokenService {
  constructor({ manager = secretManager } = {}) {
    this.secretManager = manager;
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
        tokenVersion: Number(user.tokenVersion || 0),
        tenantId: user.tenantId || 'default-tenant',
        organizationId: user.organizationId || 'default-organization',
      },
      this.secretManager.getSecret(SECRET_NAMES.JWT_SECRET),
      {
        expiresIn: this.accessTokenTtl,
      }
    );
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.secretManager.getSecret(SECRET_NAMES.JWT_SECRET));
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
