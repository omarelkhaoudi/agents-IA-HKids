import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { ROLES } from '../src/constants/roles.js';
import { UserRepository } from '../src/repositories/UserRepository.js';
import { RefreshTokenRepository } from '../src/repositories/RefreshTokenRepository.js';
import { KnowledgeDocumentRepository } from '../src/repositories/KnowledgeDocumentRepository.js';
import { SecurityRepository } from '../src/repositories/SecurityRepository.js';
import { AuthService } from '../src/services/auth/AuthService.js';
import { TokenService } from '../src/services/auth/TokenService.js';
import { SecretManager, SECRET_NAMES } from '../src/services/security/SecretManager.js';
import { EncryptionService } from '../src/services/security/EncryptionService.js';
import { SecurityAuditService } from '../src/services/security/SecurityAuditService.js';
import { DocumentAclService } from '../src/services/security/DocumentAclService.js';
import { SecurityDashboardService } from '../src/services/security/SecurityDashboardService.js';
import { EvaluationService } from '../src/services/evaluation/EvaluationService.js';
import { runWithTenantContext } from '../src/services/security/TenantContext.js';

async function createSecurityStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const userRepository = new UserRepository(pool);
  const refreshTokenRepository = new RefreshTokenRepository(pool);
  const securityRepository = new SecurityRepository(pool);
  const auditService = new SecurityAuditService({ securityRepository });
  const tokenSecretManager = new SecretManager({
    source: {
      JWT_SECRET: 'test-jwt-secret',
      ENCRYPTION_KEY: 'test-encryption-secret',
      ANTHROPIC_API_KEY: 'test-claude-key',
    },
  });
  const tokenService = new TokenService({ manager: tokenSecretManager });
  const authService = new AuthService({
    userRepository,
    refreshTokenRepository,
    tokenService,
    securityRepository,
    auditService,
  });

  return {
    pool,
    userRepository,
    refreshTokenRepository,
    securityRepository,
    auditService,
    tokenService,
    authService,
  };
}

async function createUser(userRepository, overrides = {}) {
  return userRepository.create({
    id: overrides.id || randomUUID(),
    email: overrides.email || `${randomUUID()}@hkids.test`,
    passwordHash: overrides.passwordHash || '$2b$12$Kg7xV0UL5u5cPxy7m5kxv.UqAtOo9J3Mv8igQStcKeMpjmmC4tB2W',
    name: overrides.name || 'Security User',
    role: overrides.role || ROLES.EMPLOYEE,
    status: overrides.status || 'active',
    tenantId: overrides.tenantId || 'default-tenant',
    organizationId: overrides.organizationId || 'default-organization',
    ownerId: overrides.ownerId || '',
  });
}

function knowledgeDocument(overrides = {}) {
  return {
    id: overrides.id || randomUUID(),
    title: overrides.title || 'Security policy',
    category: overrides.category || 'Policies',
    description: overrides.description || 'Tenant scoped security content',
    tags: overrides.tags || ['security'],
    createdDate: overrides.createdDate || new Date(),
    updatedDate: overrides.updatedDate || new Date(),
    status: overrides.status || 'active',
    author: overrides.author || 'owner@hkids.test',
    owner: overrides.owner || 'owner@hkids.test',
    ownerId: overrides.ownerId || 'owner-user',
    fileType: overrides.fileType || 'TXT',
    sourceFileName: overrides.sourceFileName || 'security.txt',
    content: overrides.content || 'Security content',
    language: overrides.language || 'en',
    aclVisibility: overrides.aclVisibility || 'organization',
    aclInherits: overrides.aclInherits ?? true,
    ...overrides,
  };
}

test('SecretManager and EncryptionService centralize provider secrets and key rotation', () => {
  const manager = new SecretManager({
    source: {
      ANTHROPIC_API_KEY: 'claude-secret',
      OPENAI_API_KEY: 'openai-secret',
      JWT_SECRET: 'jwt-secret',
      ENCRYPTION_KEY: 'encryption-secret',
    },
  });
  const encryptionService = new EncryptionService({ manager });

  assert.equal(manager.getProviderConfiguration('anthropic').apiKey, 'claude-secret');
  assert.equal(manager.getProviderConfiguration('openai').apiKey, 'openai-secret');

  const rotated = manager.rotateSecret(SECRET_NAMES.OPENAI_API_KEY, 'openai-rotated');
  assert.equal(rotated.version, 1);
  assert.equal(manager.getProviderConfiguration('openai').apiKey, 'openai-rotated');
  assert.equal(manager.validateSecret(SECRET_NAMES.OPENAI_API_KEY).status, 'healthy');

  const encrypted = encryptionService.encrypt('classified');
  assert.notEqual(encrypted, 'classified');
  assert.equal(encryptionService.decrypt(encrypted), 'classified');

  const rotation = encryptionService.rotateKey();
  assert.equal(rotation.version, 2);
  assert.equal(encryptionService.getHealth().status, 'healthy');
});

test('AuthService tracks sessions, failed logins, lockout, refresh rotation and forced logout', async () => {
  const { authService, userRepository, securityRepository, tokenService } =
    await createSecurityStack();

  const admin = await authService.ensureDefaultAdmin({
    email: 'admin@hkids.test',
    password: 'Admin123!',
    name: 'H-Kids Administrator',
  });

  const login = await authService.login({
    email: 'admin@hkids.test',
    password: 'Admin123!',
    ipAddress: '127.0.0.1',
    userAgent: 'node-test',
    deviceId: 'device-a',
  });
  assert.ok(login.accessToken);

  const sessions = await securityRepository.listActiveSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].deviceId, 'device-a');

  const refreshed = await authService.refresh(login.refreshToken, { deviceId: 'device-a' });
  assert.ok(refreshed.refreshToken);
  assert.notEqual(refreshed.refreshToken, login.refreshToken);
  await assert.rejects(() => authService.refresh(login.refreshToken), /Invalid refresh token/);

  const payload = tokenService.verifyAccessToken(refreshed.accessToken);
  await authService.forceLogout(admin.id, 'security-admin');
  await assert.rejects(() => authService.validateAccessPayload(payload), /revoked/);

  const passwordHash = await authService.hashPassword('Correct123!');
  await createUser(userRepository, {
    email: 'employee@hkids.test',
    passwordHash,
    role: ROLES.EMPLOYEE,
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(
      () => authService.login({ email: 'employee@hkids.test', password: 'wrong' }),
      /Invalid email or password/
    );
  }

  const locked = await securityRepository.listLockedAccounts();
  assert.equal(locked.length, 1);
  assert.equal(locked[0].email, 'employee@hkids.test');

  await assert.rejects(
    () => authService.login({ email: 'employee@hkids.test', password: 'Correct123!' }),
    /temporarily locked/
  );
});

test('Knowledge repository tenant context automatically isolates documents', async () => {
  const { pool } = await createSecurityStack();
  const repository = new KnowledgeDocumentRepository(pool);
  const tenantA = { tenantId: 'tenant-a', organizationId: 'org-a', userId: 'owner-a' };
  const tenantB = { tenantId: 'tenant-b', organizationId: 'org-b', userId: 'owner-b' };

  const docA = await runWithTenantContext(tenantA, () =>
    repository.create(knowledgeDocument({ title: 'Tenant A knowledge' }))
  );
  const docB = await runWithTenantContext(tenantB, () =>
    repository.create(knowledgeDocument({ title: 'Tenant B knowledge' }))
  );

  const tenantAItems = await runWithTenantContext(tenantA, () => repository.list({}));
  const tenantBItems = await runWithTenantContext(tenantB, () => repository.list({}));

  assert.deepEqual(tenantAItems.map((item) => item.id), [docA.id]);
  assert.deepEqual(tenantBItems.map((item) => item.id), [docB.id]);
  assert.equal(await runWithTenantContext(tenantA, () => repository.getById(docB.id)), null);
});

test('DocumentAclService enforces private documents, sharing and audit trail', async () => {
  const { pool, securityRepository, auditService } = await createSecurityStack();
  const repository = new KnowledgeDocumentRepository(pool);
  const documentAclService = new DocumentAclService({ securityRepository, auditService });
  const tenant = { tenantId: 'tenant-sec', organizationId: 'org-sec', userId: 'owner-user' };
  const owner = {
    id: 'owner-user',
    email: 'owner@hkids.test',
    role: ROLES.EMPLOYEE,
    tenantId: tenant.tenantId,
    organizationId: tenant.organizationId,
  };
  const viewer = {
    id: 'viewer-user',
    email: 'viewer@hkids.test',
    role: ROLES.READ_ONLY,
    tenantId: tenant.tenantId,
    organizationId: tenant.organizationId,
  };

  const document = await runWithTenantContext(tenant, () =>
    repository.create(knowledgeDocument({ aclVisibility: 'private', ownerId: owner.id }))
  );

  await assert.rejects(
    () =>
      runWithTenantContext(tenant, () =>
        documentAclService.ensureAccess({ user: viewer, tenant, document, action: 'read' })
      ),
    /permission/
  );

  await runWithTenantContext(tenant, () =>
    documentAclService.ensureAccess({ user: owner, tenant, document, action: 'read' })
  );

  const entry = await runWithTenantContext(tenant, () =>
    documentAclService.shareDocument(
      document,
      { principalType: 'user', principalId: viewer.email, accessLevel: 'read' },
      owner
    )
  );
  assert.equal(entry.accessLevel, 'read');

  const allowed = await runWithTenantContext(tenant, () =>
    documentAclService.ensureAccess({ user: viewer, tenant, document, action: 'read' })
  );
  assert.equal(allowed.reason, 'explicit_acl');

  const events = await runWithTenantContext(tenant, () =>
    securityRepository.listSecurityEvents({ limit: 20 })
  );
  assert.ok(events.some((event) => event.eventType === 'permission_denied'));
  assert.ok(events.some((event) => event.eventType === 'acl_modified'));
  assert.ok(events.some((event) => event.eventType === 'document_access'));
});

test('Security dashboard feeds Evaluation Platform security metrics', async () => {
  const { securityRepository, userRepository, auditService } = await createSecurityStack();
  const manager = new SecretManager({
    source: {
      ANTHROPIC_API_KEY: 'claude-secret',
      JWT_SECRET: 'jwt-secret',
      ENCRYPTION_KEY: 'encryption-secret',
    },
  });
  const encryptionService = new EncryptionService({ manager });
  const securityDashboardService = new SecurityDashboardService({
    securityRepository,
    secretManager: manager,
    encryptionService,
  });
  const evaluationService = new EvaluationService({ securityDashboardService });
  const user = await createUser(userRepository, {
    id: 'dashboard-user',
    email: 'dashboard@hkids.test',
    role: ROLES.ADMINISTRATOR,
  });

  await securityRepository.saveAuthSession({
    userId: user.id,
    refreshTokenId: null,
    deviceId: 'admin-console',
    expiresAt: new Date(Date.now() + 60_000),
  });
  await auditService.record({
    user,
    eventType: 'permission_denied',
    allowed: false,
    subjectType: 'document',
    subjectId: 'doc-denied',
    action: 'delete',
    reason: 'missing_delete_permission',
  });

  const dashboard = await securityDashboardService.getDashboard();
  assert.equal(dashboard.metrics.activeSessions, 1);
  assert.equal(dashboard.metrics.permissionViolations, 1);
  assert.equal(dashboard.secretHealth.items.some((item) => item.name === SECRET_NAMES.CLAUDE_API_KEY), true);
  assert.equal(dashboard.encryptionHealth.status, 'healthy');

  const securityEvaluation = await evaluationService.getSecurityEvaluation();
  assert.equal(securityEvaluation.metrics.activeSessions, 1);
  assert.equal(typeof securityEvaluation.securityScore, 'number');
  assert.ok(securityEvaluation.securityScore > 0);
});
