import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Local filesystem storage provider.
 * Swap implementation later (S3, Azure Blob) without changing DMS service contracts.
 */
export class LocalDocumentStorageProvider {
  constructor(options = {}) {
    this.rootDirectory =
      options.rootDirectory ||
      path.resolve(__dirname, '..', '..', '..', 'storage', 'dms');
  }

  async ensureReady() {
    await mkdir(this.rootDirectory, { recursive: true });
  }

  buildKey(documentId, version, extension) {
    const safeExt = String(extension || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    return path.posix.join(documentId, `v${version}.${safeExt}`);
  }

  resolvePath(storageKey) {
    return path.join(this.rootDirectory, ...String(storageKey).split('/'));
  }

  async save({ documentId, version, extension, buffer }) {
    await this.ensureReady();
    const storageKey = this.buildKey(documentId, version, extension);
    const absolutePath = this.resolvePath(storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
    const checksum = createHash('sha256').update(buffer).digest('hex');
    return {
      storageKey,
      checksum,
      byteSize: buffer.byteLength,
    };
  }

  async read(storageKey) {
    const absolutePath = this.resolvePath(storageKey);
    await access(absolutePath);
    return readFile(absolutePath);
  }

  async remove(storageKey) {
    try {
      await unlink(this.resolvePath(storageKey));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * OCR provider abstraction — no concrete OCR vendor in this sprint.
 */
export class NoopOcrProvider {
  get name() {
    return 'noop-ocr';
  }

  async extractText(input = {}) {
    return {
      provider: this.name,
      status: 'unsupported',
      text: '',
      message: 'OCR provider abstraction ready. No vendor configured.',
      filename: input.filename || '',
    };
  }
}

/**
 * Virus scan abstraction — no concrete scanner in this sprint.
 */
export class NoopVirusScanProvider {
  get name() {
    return 'noop-virus-scan';
  }

  async scan(input = {}) {
    return {
      provider: this.name,
      status: 'skipped',
      message: 'Virus scan abstraction ready. No scanner configured.',
      filename: input.filename || '',
    };
  }
}

export function createDmsInfrastructure(options = {}) {
  return {
    storage: options.storage || new LocalDocumentStorageProvider(options.storageOptions),
    ocr: options.ocr || new NoopOcrProvider(),
    virusScan: options.virusScan || new NoopVirusScanProvider(),
    maxUploadBytes: options.maxUploadBytes || 25 * 1024 * 1024,
  };
}

export function newUploadSessionId() {
  return `upload-${randomUUID()}`;
}
