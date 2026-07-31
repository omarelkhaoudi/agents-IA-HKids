import { env } from '../config/env.js';
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { AuthService } from '../services/auth/AuthService.js';
import { TokenService } from '../services/auth/TokenService.js';
import { persistenceService } from './assistant-runtime.js';
import { databasePool, initializeDatabaseRuntime } from './database-runtime.js';
import { securityAuditService, securityRepository } from './security-runtime.js';

const userRepository = new UserRepository(databasePool);
const refreshTokenRepository = new RefreshTokenRepository(databasePool);
const tokenService = new TokenService();

export const authService = new AuthService({
  userRepository,
  refreshTokenRepository,
  tokenService,
  securityRepository,
  auditService: securityAuditService,
});

export async function initializeAuthRuntime() {
  await initializeDatabaseRuntime();
  await persistenceService.initialize();

  const defaultAdmin = await authService.ensureDefaultAdmin({
    email: env.defaultAdminEmail,
    password: env.defaultAdminPassword,
    name: env.defaultAdminName,
  });

  if (defaultAdmin) {
    console.info(`Default super admin created: ${defaultAdmin.email}`);
  }

  await refreshTokenRepository.deleteExpired();
}
