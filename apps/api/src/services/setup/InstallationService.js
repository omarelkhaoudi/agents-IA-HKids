import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ROLES } from '../../constants/roles.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const secretsPath = path.join(apiRoot, 'config', 'runtime-secrets.json');

export function loadRuntimeSecrets() {
  if (!existsSync(secretsPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(secretsPath, 'utf8'));
  } catch {
    return {};
  }
}

export function applyRuntimeSecretsToEnv() {
  const secrets = loadRuntimeSecrets();

  if (secrets.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = secrets.ANTHROPIC_API_KEY;
    env.anthropicApiKey = secrets.ANTHROPIC_API_KEY;
  }

  if (secrets.OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = secrets.OPENAI_API_KEY;
    env.openAiApiKey = secrets.OPENAI_API_KEY;
  }

  if (secrets.DEFAULT_PROVIDER) {
    env.defaultProvider = secrets.DEFAULT_PROVIDER;
  }

  if (secrets.DEFAULT_MODEL) {
    env.defaultModel = secrets.DEFAULT_MODEL;
  }
}

function saveRuntimeSecrets(updates) {
  const current = loadRuntimeSecrets();
  const next = { ...current, ...updates };
  mkdirSync(path.dirname(secretsPath), { recursive: true });
  writeFileSync(secretsPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  return next;
}

export class InstallationService {
  constructor({ authService, systemSettingsService, userRepository }) {
    this.authService = authService;
    this.systemSettingsService = systemSettingsService;
    this.userRepository = userRepository;
  }

  async getStatus() {
    const settings = await this.systemSettingsService.getSettings();
    const userCount = await this.userRepository.count();
    const setupCompleted = settings.setup_completed === 'true';
    const secrets = loadRuntimeSecrets();

    return {
      requiresSetup: !setupCompleted,
      setupCompleted,
      hasAdministrator: userCount > 0,
      anthropicConfigured: Boolean(env.anthropicApiKey || secrets.ANTHROPIC_API_KEY),
      defaultProvider: settings.default_provider || env.defaultProvider,
      defaultModel: settings.default_model || env.defaultModel,
      companyName: settings.company_name || '',
    };
  }

  async completeSetup(payload = {}) {
    const status = await this.getStatus();

    if (status.setupCompleted) {
      throw Object.assign(new Error('Setup has already been completed.'), { statusCode: 409 });
    }

    const {
      companyName,
      companyAddress,
      companyEmail,
      companyPhone,
      administratorName,
      administratorEmail,
      administratorPassword,
      anthropicApiKey,
      defaultProvider = 'anthropic',
      defaultModel = 'claude-3-5-sonnet-latest',
      language = 'French',
      timezone = 'Africa/Casablanca',
      currency = 'MAD',
    } = payload;

    if (!companyName || !administratorName || !administratorEmail || !administratorPassword) {
      throw Object.assign(
        new Error('Company information and administrator account are required.'),
        { statusCode: 400 }
      );
    }

    if (String(administratorPassword).length < 8) {
      throw Object.assign(new Error('Administrator password must be at least 8 characters.'), {
        statusCode: 400,
      });
    }

    if (!status.hasAdministrator) {
      const passwordHash = await this.authService.hashPassword(administratorPassword);
      await this.userRepository.create({
        id: randomUUID(),
        email: administratorEmail,
        passwordHash,
        name: administratorName,
        role: ROLES.SUPER_ADMIN,
        status: 'active',
      });
    }

    if (anthropicApiKey) {
      saveRuntimeSecrets({
        ANTHROPIC_API_KEY: anthropicApiKey,
        DEFAULT_PROVIDER: defaultProvider,
        DEFAULT_MODEL: defaultModel,
      });
      env.anthropicApiKey = anthropicApiKey;
      process.env.ANTHROPIC_API_KEY = anthropicApiKey;
    }

    env.defaultProvider = defaultProvider;
    env.defaultModel = defaultModel;

    const settings = await this.systemSettingsService.updateSettings({
      company_name: companyName,
      company_address: companyAddress || '',
      company_email: companyEmail || '',
      company_phone: companyPhone || '',
      default_provider: defaultProvider,
      default_model: defaultModel,
      default_language: language,
      timezone,
      currency,
      setup_completed: 'true',
      setup_completed_at: new Date().toISOString(),
    });

    logger.info('installation_setup_completed', {
      companyName,
      administratorEmail,
      defaultProvider,
      defaultModel,
    });

    return {
      success: true,
      settings,
      requiresSetup: false,
    };
  }

  async markSetupCompletedIfSeeded() {
    const settings = await this.systemSettingsService.getSettings();

    if (settings.setup_completed === 'true') {
      return;
    }

    if (env.nodeEnv === 'production') {
      await this.systemSettingsService.updateSettings({
        setup_completed: settings.setup_completed || 'false',
      });
      return;
    }

    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      await this.systemSettingsService.updateSettings({
        setup_completed: 'true',
        setup_completed_at: new Date().toISOString(),
      });
    }
  }
}
