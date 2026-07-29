import { UserRepository } from '../repositories/UserRepository.js';
import { InstallationService, applyRuntimeSecretsToEnv } from '../services/setup/InstallationService.js';
import { authService } from './auth-runtime.js';
import { systemSettingsService } from './admin-runtime.js';
import { databasePool } from './database-runtime.js';

applyRuntimeSecretsToEnv();

const userRepository = new UserRepository(databasePool);

export const installationService = new InstallationService({
  authService,
  systemSettingsService,
  userRepository,
});

export async function initializeSetupRuntime() {
  applyRuntimeSecretsToEnv();
  await installationService.markSetupCompletedIfSeeded();
}
