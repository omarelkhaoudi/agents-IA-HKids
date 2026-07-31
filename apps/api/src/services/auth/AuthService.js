import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { ROLES } from '../../constants/roles.js';
import { TokenService } from './TokenService.js';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export class AuthService {
  constructor({
    userRepository,
    refreshTokenRepository,
    tokenService = new TokenService(),
    securityRepository = null,
    auditService = null,
  }) {
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.tokenService = tokenService;
    this.securityRepository = securityRepository;
    this.auditService = auditService;
  }

  async hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }

  getClientMetadata(metadata = {}) {
    return {
      ipAddress: metadata.ipAddress || '',
      userAgent: metadata.userAgent || '',
      deviceId: metadata.deviceId || '',
    };
  }

  isLocked(user) {
    return user?.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now();
  }

  async auditAuth(eventType, { user, email, allowed, reason, metadata = {} } = {}) {
    if (!this.auditService) return;
    await this.auditService.record({
      user: user || { email },
      eventType,
      severity: allowed === false ? 'warning' : 'info',
      subjectType: 'user',
      subjectId: user?.id || null,
      action: eventType,
      allowed,
      reason,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata,
    });
  }

  async login({ email, password, ipAddress = '', userAgent = '', deviceId = '' }) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const metadata = this.getClientMetadata({ ipAddress, userAgent, deviceId });
    const user = await this.userRepository.findByEmail(email);

    if (!user || user.status !== 'active') {
      await this.auditAuth('login_failed', {
        email,
        allowed: false,
        reason: 'invalid_credentials',
        metadata,
      });
      throw new Error('Invalid email or password.');
    }

    if (this.isLocked(user)) {
      await this.auditAuth('account_locked_login_blocked', {
        user,
        allowed: false,
        reason: 'account_locked',
        metadata,
      });
      throw new Error('Account is temporarily locked. Try again later.');
    }

    const passwordMatches = await this.verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      const failedCount = Number(user.failedLoginCount || 0) + 1;
      const lockUntil =
        failedCount >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null;
      const updated = await this.userRepository.recordLoginFailure(user.id, { lockUntil });
      await this.auditAuth(lockUntil ? 'account_locked' : 'login_failed', {
        user: updated || user,
        allowed: false,
        reason: lockUntil ? 'too_many_failed_logins' : 'invalid_credentials',
        metadata: { ...metadata, failedLoginCount: failedCount },
      });
      throw new Error('Invalid email or password.');
    }

    const updatedUser = await this.userRepository.recordLoginSuccess(user.id, metadata);
    await this.auditAuth('login_success', {
      user: updatedUser || user,
      allowed: true,
      reason: 'password_verified',
      metadata,
    });
    return this.issueTokens(updatedUser || user, metadata);
  }

  async refresh(refreshToken, metadata = {}) {
    if (!refreshToken) {
      throw new Error('Refresh token is required.');
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken || storedToken.revokedAt) {
      throw new Error('Invalid refresh token.');
    }

    if (new Date(storedToken.expiresAt).getTime() < Date.now()) {
      await this.refreshTokenRepository.revoke(storedToken.id);
      throw new Error('Refresh token has expired.');
    }

    const user = await this.userRepository.findById(storedToken.userId);

    if (!user || user.status !== 'active') {
      await this.refreshTokenRepository.revoke(storedToken.id);
      throw new Error('User account is not active.');
    }

    if (Number(storedToken.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      await this.refreshTokenRepository.revoke(storedToken.id);
      await this.securityRepository?.revokeAuthSession(storedToken.id);
      throw new Error('Refresh token has been revoked.');
    }

    await this.refreshTokenRepository.revoke(storedToken.id);
    await this.securityRepository?.revokeAuthSession(storedToken.id);
    return this.issueTokens(user, {
      ...metadata,
      deviceId: metadata.deviceId || storedToken.deviceId,
      ipAddress: metadata.ipAddress || storedToken.ipAddress,
      userAgent: metadata.userAgent || storedToken.userAgent,
      rotatedFromTokenId: storedToken.id,
    });
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      return { success: true };
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (storedToken) {
      await this.refreshTokenRepository.revoke(storedToken.id);
      await this.securityRepository?.revokeAuthSession(storedToken.id);
    }

    return { success: true };
  }

  async logoutAll(userId) {
    await this.refreshTokenRepository.revokeAllForUser(userId);
    await this.securityRepository?.revokeAuthSessionsForUser(userId);
    await this.userRepository.incrementTokenVersion(userId);
    return { success: true };
  }

  async forceLogout(userId, actor = '') {
    const user = await this.userRepository.incrementTokenVersion(userId);
    await this.refreshTokenRepository.revokeAllForUser(userId);
    await this.securityRepository?.revokeAuthSessionsForUser(userId);
    await this.auditAuth('forced_logout', {
      user,
      allowed: true,
      reason: 'token_version_incremented',
      metadata: { actor },
    });
    return { success: true, user: this.userRepository.toPublicUser(user) };
  }

  async getCurrentUser(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user || user.status !== 'active') {
      throw new Error('User not found.');
    }

    return this.userRepository.toPublicUser(user);
  }

  async ensureDefaultAdmin({ email, password, name }) {
    const userCount = await this.userRepository.count();

    if (userCount > 0) {
      return null;
    }

    const passwordHash = await this.hashPassword(password);
    const user = await this.userRepository.create({
      id: randomUUID(),
      email,
      passwordHash,
      name,
      role: ROLES.SUPER_ADMIN,
      status: 'active',
      tenantId: 'default-tenant',
      organizationId: 'default-organization',
    });

    return this.userRepository.toPublicUser(user);
  }

  async validateAccessPayload(payload) {
    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.status !== 'active') {
      throw new Error('User account is not active.');
    }

    if (this.isLocked(user)) {
      throw new Error('User account is locked.');
    }

    if (Number(payload.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      throw new Error('Access token has been revoked.');
    }

    return user;
  }

  async issueTokens(user, metadata = {}) {
    const accessToken = this.tokenService.signAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken();
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const refreshTokenId = randomUUID();

    await this.refreshTokenRepository.create({
      id: refreshTokenId,
      userId: user.id,
      tokenHash,
      expiresAt: this.tokenService.getRefreshTokenExpiry(),
      deviceId: metadata.deviceId || '',
      ipAddress: metadata.ipAddress || '',
      userAgent: metadata.userAgent || '',
      tokenVersion: Number(user.tokenVersion || 0),
      rotatedFromTokenId: metadata.rotatedFromTokenId || null,
      tenantId: user.tenantId || 'default-tenant',
      organizationId: user.organizationId || 'default-organization',
    });

    await this.securityRepository?.saveAuthSession({
      userId: user.id,
      refreshTokenId,
      deviceId: metadata.deviceId || '',
      ipAddress: metadata.ipAddress || '',
      userAgent: metadata.userAgent || '',
      tenantId: user.tenantId || 'default-tenant',
      organizationId: user.organizationId || 'default-organization',
      expiresAt: this.tokenService.getRefreshTokenExpiry(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokenService.accessTokenTtl,
      user: this.userRepository.toPublicUser(user),
    };
  }
}
