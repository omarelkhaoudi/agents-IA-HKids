import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { ROLES } from '../../constants/roles.js';
import { TokenService } from './TokenService.js';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor({ userRepository, refreshTokenRepository, tokenService = new TokenService() }) {
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.tokenService = tokenService;
  }

  async hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }

  async login({ email, password }) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user || user.status !== 'active') {
      throw new Error('Invalid email or password.');
    }

    const passwordMatches = await this.verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      throw new Error('Invalid email or password.');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken) {
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

    await this.refreshTokenRepository.revoke(storedToken.id);
    return this.issueTokens(user);
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      return { success: true };
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (storedToken) {
      await this.refreshTokenRepository.revoke(storedToken.id);
    }

    return { success: true };
  }

  async logoutAll(userId) {
    await this.refreshTokenRepository.revokeAllForUser(userId);
    return { success: true };
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
    });

    return this.userRepository.toPublicUser(user);
  }

  async issueTokens(user) {
    const accessToken = this.tokenService.signAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken();
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    await this.refreshTokenRepository.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
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
