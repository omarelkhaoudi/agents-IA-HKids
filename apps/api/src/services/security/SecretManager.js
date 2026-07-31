import { createHash } from 'node:crypto';

export const SECRET_NAMES = {
  CLAUDE_API_KEY: 'CLAUDE_API_KEY',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  ELEVENLABS_API_KEY: 'ELEVENLABS_API_KEY',
  SMTP_PASSWORD: 'SMTP_PASSWORD',
  SMTP_HOST: 'SMTP_HOST',
  SMTP_USER: 'SMTP_USER',
  DATABASE_URL: 'DATABASE_URL',
  DB_PASSWORD: 'DB_PASSWORD',
  JWT_SECRET: 'JWT_SECRET',
  ENCRYPTION_KEY: 'ENCRYPTION_KEY',
};

const DEFINITIONS = {
  [SECRET_NAMES.CLAUDE_API_KEY]: {
    envNames: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
    provider: 'anthropic',
    requiredInProduction: true,
  },
  [SECRET_NAMES.OPENAI_API_KEY]: {
    envNames: ['OPENAI_API_KEY'],
    provider: 'openai',
    requiredInProduction: false,
  },
  [SECRET_NAMES.ELEVENLABS_API_KEY]: {
    envNames: ['ELEVENLABS_API_KEY'],
    provider: 'elevenlabs',
    requiredInProduction: false,
  },
  [SECRET_NAMES.SMTP_PASSWORD]: {
    envNames: ['SMTP_PASSWORD', 'SMTP_PASS'],
    provider: 'smtp',
    requiredInProduction: false,
  },
  [SECRET_NAMES.SMTP_HOST]: {
    envNames: ['SMTP_HOST'],
    provider: 'smtp',
    requiredInProduction: false,
  },
  [SECRET_NAMES.SMTP_USER]: {
    envNames: ['SMTP_USER', 'SMTP_USERNAME'],
    provider: 'smtp',
    requiredInProduction: false,
  },
  [SECRET_NAMES.DATABASE_URL]: {
    envNames: ['DATABASE_URL'],
    provider: 'database',
    requiredInProduction: true,
  },
  [SECRET_NAMES.DB_PASSWORD]: {
    envNames: ['DB_PASSWORD'],
    provider: 'database',
    requiredInProduction: false,
  },
  [SECRET_NAMES.JWT_SECRET]: {
    envNames: ['JWT_SECRET'],
    provider: 'auth',
    requiredInProduction: true,
    developmentFallback: 'dev-only-jwt-secret-change-in-production',
  },
  [SECRET_NAMES.ENCRYPTION_KEY]: {
    envNames: ['ENCRYPTION_KEY'],
    provider: 'security',
    requiredInProduction: true,
    developmentFallback: 'dev-only-encryption-key-change-in-production',
  },
};

function nodeEnv() {
  return process.env.NODE_ENV || 'development';
}

function isLocalEnvironment() {
  return nodeEnv() === 'development' || nodeEnv() === 'test';
}

function canonicalName(name) {
  const normalized = String(name || '').trim();
  const upper = normalized.toUpperCase();

  if (DEFINITIONS[upper]) {
    return upper;
  }

  const entry = Object.entries(DEFINITIONS).find(([, definition]) =>
    definition.envNames.includes(upper)
  );

  return entry?.[0] || upper;
}

function redact(value) {
  if (!value) return '';
  const digest = createHash('sha256').update(String(value)).digest('hex').slice(0, 8);
  return `sha256:${digest}`;
}

export class SecretManager {
  constructor({ source = process.env } = {}) {
    this.source = source;
    this.localOverrides = new Map();
    this.rotations = new Map();
  }

  listSupportedSecrets() {
    return Object.keys(DEFINITIONS);
  }

  getDefinition(name) {
    return DEFINITIONS[canonicalName(name)] || {
      envNames: [canonicalName(name)],
      provider: 'environment',
      requiredInProduction: false,
    };
  }

  getSecret(name) {
    const canonical = canonicalName(name);
    const definition = this.getDefinition(canonical);

    if (this.localOverrides.has(canonical)) {
      return this.localOverrides.get(canonical);
    }

    for (const envName of definition.envNames) {
      const value = this.source[envName];
      if (value) {
        return value;
      }
    }

    if (isLocalEnvironment() && definition.developmentFallback) {
      return definition.developmentFallback;
    }

    return '';
  }

  hasSecret(name) {
    return Boolean(this.getSecret(name));
  }

  setLocalSecret(name, value) {
    const canonical = canonicalName(name);
    const secret = String(value || '');

    if (!secret) {
      this.localOverrides.delete(canonical);
      return { name: canonical, configured: false, source: 'memory' };
    }

    this.localOverrides.set(canonical, secret);
    return { name: canonical, configured: true, source: 'memory', fingerprint: redact(secret) };
  }

  rotateSecret(name, value, { expiresAt } = {}) {
    const result = this.setLocalSecret(name, value);
    const previous = this.rotations.get(result.name) || { version: 0 };
    const metadata = {
      version: previous.version + 1,
      rotatedAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      fingerprint: result.fingerprint || '',
    };
    this.rotations.set(result.name, metadata);
    return { ...result, ...metadata };
  }

  validateSecret(name) {
    const canonical = canonicalName(name);
    const definition = this.getDefinition(canonical);
    const value = this.getSecret(canonical);
    const required = definition.requiredInProduction && nodeEnv() === 'production';
    const rotation = this.rotations.get(canonical) || {};
    const expired = rotation.expiresAt ? new Date(rotation.expiresAt).getTime() < Date.now() : false;
    const source = this.localOverrides.has(canonical)
      ? 'memory'
      : definition.envNames.find((envName) => this.source[envName])
        ? 'environment'
        : isLocalEnvironment() && definition.developmentFallback
          ? 'local-development'
          : '';

    return {
      name: canonical,
      provider: definition.provider,
      required,
      configured: Boolean(value),
      source,
      status: expired ? 'expired' : value || !required ? 'healthy' : 'missing',
      fingerprint: value ? redact(value) : '',
      lastValidatedAt: new Date().toISOString(),
      rotatedAt: rotation.rotatedAt || null,
      expiresAt: rotation.expiresAt || null,
    };
  }

  validateAll() {
    return this.listSupportedSecrets().map((name) => this.validateSecret(name));
  }

  getProviderConfiguration(provider) {
    const key = String(provider || '').toLowerCase();

    if (key === 'anthropic' || key === 'claude') {
      return {
        provider: 'anthropic',
        apiKey: this.getSecret(SECRET_NAMES.CLAUDE_API_KEY),
      };
    }

    if (key === 'openai') {
      return {
        provider: 'openai',
        apiKey: this.getSecret(SECRET_NAMES.OPENAI_API_KEY),
      };
    }

    if (key === 'elevenlabs') {
      return {
        provider: 'elevenlabs',
        apiKey: this.getSecret(SECRET_NAMES.ELEVENLABS_API_KEY),
      };
    }

    if (key === 'smtp') {
      return {
        provider: 'smtp',
        host: this.getSecret(SECRET_NAMES.SMTP_HOST),
        user: this.getSecret(SECRET_NAMES.SMTP_USER),
        password: this.getSecret(SECRET_NAMES.SMTP_PASSWORD),
      };
    }

    return { provider: key };
  }

  getSecretHealth() {
    const items = this.validateAll();
    return {
      generatedAt: new Date().toISOString(),
      healthy: items.filter((item) => item.status === 'healthy').length,
      missing: items.filter((item) => item.status === 'missing').length,
      expired: items.filter((item) => item.status === 'expired').length,
      items,
    };
  }
}

export const secretManager = new SecretManager();
