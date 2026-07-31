import crypto from 'node:crypto';
import { SECRET_NAMES, secretManager } from './SecretManager.js';

const PREFIX = 'enc:v1';
const ALGORITHM = 'aes-256-gcm';

function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest();
}

function encode(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function decode(value) {
  return Buffer.from(String(value || ''), 'base64url');
}

export class EncryptionService {
  constructor({ manager = secretManager, keyId = 'primary' } = {}) {
    this.secretManager = manager;
    this.keyId = keyId;
    this.keyVersion = 1;
    this.rotatedAt = null;
  }

  getKey() {
    return deriveKey(this.secretManager.getSecret(SECRET_NAMES.ENCRYPTION_KEY));
  }

  encrypt(value, metadata = {}) {
    if (value === null || value === undefined) {
      return value;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, this.getKey(), iv);
    const plaintext = Buffer.from(String(value), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    const aad = {
      keyId: metadata.keyId || this.keyId,
      version: metadata.version || this.keyVersion,
    };

    return [
      PREFIX,
      aad.keyId,
      String(aad.version),
      encode(iv),
      encode(tag),
      encode(encrypted),
    ].join(':');
  }

  decrypt(value) {
    if (value === null || value === undefined || value === '') {
      return value;
    }

    const text = String(value);
    if (!text.startsWith(`${PREFIX}:`)) {
      return text;
    }

    const [, , , , iv, tag, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.getKey(), decode(iv));
    decipher.setAuthTag(decode(tag));
    return Buffer.concat([decipher.update(decode(encrypted)), decipher.final()]).toString('utf8');
  }

  encryptField(object, fieldName) {
    if (!object || object[fieldName] === undefined) {
      return object;
    }

    return {
      ...object,
      [fieldName]: this.encrypt(object[fieldName]),
    };
  }

  decryptField(object, fieldName) {
    if (!object || object[fieldName] === undefined) {
      return object;
    }

    return {
      ...object,
      [fieldName]: this.decrypt(object[fieldName]),
    };
  }

  rotateKey() {
    this.keyVersion += 1;
    this.rotatedAt = new Date().toISOString();
    return {
      keyId: this.keyId,
      version: this.keyVersion,
      algorithm: ALGORITHM,
      rotatedAt: this.rotatedAt,
    };
  }

  rotateEncryptedValue(value) {
    return this.encrypt(this.decrypt(value));
  }

  getHealth() {
    const configured = this.secretManager.hasSecret(SECRET_NAMES.ENCRYPTION_KEY);
    return {
      status: configured ? 'healthy' : 'missing',
      configured,
      keyId: this.keyId,
      version: this.keyVersion,
      algorithm: ALGORITHM,
      rotatedAt: this.rotatedAt,
    };
  }
}

export const encryptionService = new EncryptionService();
