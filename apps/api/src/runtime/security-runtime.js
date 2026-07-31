import { SecurityRepository } from '../repositories/SecurityRepository.js';
import { DocumentAclService } from '../services/security/DocumentAclService.js';
import { encryptionService } from '../services/security/EncryptionService.js';
import { ObjectAuthorizationService } from '../services/security/ObjectAuthorizationService.js';
import { secretManager } from '../services/security/SecretManager.js';
import { SecurityAuditService } from '../services/security/SecurityAuditService.js';
import { SecurityDashboardService } from '../services/security/SecurityDashboardService.js';
import { persistenceService } from './assistant-runtime.js';

export const securityRepository = new SecurityRepository(persistenceService.pool);

export const securityAuditService = new SecurityAuditService({
  securityRepository,
});

export const objectAuthorizationService = new ObjectAuthorizationService({
  auditService: securityAuditService,
});

export const documentAclService = new DocumentAclService({
  securityRepository,
  auditService: securityAuditService,
});

export const securityDashboardService = new SecurityDashboardService({
  securityRepository,
  secretManager,
  encryptionService,
});

export { encryptionService, secretManager };

export async function initializeSecurityRuntime() {
  await securityDashboardService.syncSecretInventory();
  await securityDashboardService.syncEncryptionInventory();
}
