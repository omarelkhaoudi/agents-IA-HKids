import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';

export const SUPPORTED_INGESTION_TYPES = new Set([
  'PDF',
  'DOCX',
  'TXT',
  'MD',
  'Markdown',
  'HTML',
  'CSV',
  'XLSX',
  'PPTX',
]);

const MIME_BY_EXTENSION = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/plain'],
  html: ['text/html'],
  htm: ['text/html'],
  csv: ['text/csv', 'text/plain', 'application/csv'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};

function normalizeWhitespace(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function stripHtml(value) {
  return normalizeWhitespace(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  );
}

function safeTextFromBuffer(buffer) {
  return normalizeWhitespace(
    buffer
      .toString('utf8')
      .replaceAll('\0', ' ')
      .replace(/[^\S\r\n]+/g, ' ')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /[A-Za-z0-9À-ÿ]{2,}/.test(line))
      .join('\n')
  );
}

function contentHash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function extensionFromName(filename = '') {
  const parts = String(filename || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function normalizeFileType(fileType = '', filename = '') {
  const extension = extensionFromName(filename);
  const candidate = String(fileType || extension || 'TXT').toUpperCase();
  if (candidate === 'MARKDOWN') return 'MD';
  if (candidate === 'HTM') return 'HTML';
  return candidate;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'les',
  'des',
  'une',
  'pour',
  'avec',
  'dans',
  'sur',
  'aux',
  'est',
  'are',
  'you',
  'vous',
  'nous',
  'qui',
  'que',
  'par',
  'pas',
  'plus',
]);

function extractKeywords(text, limit = 16) {
  const counts = new Map();
  tokenize(text).forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

function detectLanguage(text) {
  const normalized = String(text || '').toLowerCase();
  const frenchSignals = [' le ', ' la ', ' les ', ' des ', ' pour ', ' avec ', ' école', ' enfants'];
  const englishSignals = [' the ', ' and ', ' for ', ' with ', ' school', ' children'];
  const french = frenchSignals.reduce((total, token) => total + (normalized.includes(token) ? 1 : 0), 0);
  const english = englishSignals.reduce((total, token) => total + (normalized.includes(token) ? 1 : 0), 0);
  if (french > english) return 'fr';
  if (english > french) return 'en';
  return normalized.match(/[àâçéèêëîïôûùüÿñæœ]/i) ? 'fr' : 'unknown';
}

function summarize(text, maxLength = 420) {
  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const summary = sentences.slice(0, 3).join(' ');
  return (summary || normalizeWhitespace(text)).slice(0, maxLength);
}

function buildSections({ fileType, content }) {
  const normalized = normalizeWhitespace(content);

  if (!normalized) return [];

  if (fileType === 'CSV' || fileType === 'XLSX') {
    const lines = normalized.split('\n').filter(Boolean);
    return [
      {
        title: 'Tabular data',
        content: lines.slice(0, 250).join('\n'),
        rowCount: Math.max(0, lines.length - 1),
      },
    ];
  }

  const markdownSections = normalized
    .split(/\n(?=#{1,6}\s+)/g)
    .map((section) => section.trim())
    .filter(Boolean);

  if ((fileType === 'MD' || fileType === 'Markdown') && markdownSections.length > 1) {
    return markdownSections.map((section, index) => {
      const [firstLine, ...rest] = section.split('\n');
      return {
        title: firstLine.replace(/^#{1,6}\s+/, '').trim() || `Section ${index + 1}`,
        content: rest.join('\n').trim() || firstLine,
      };
    });
  }

  return normalized
    .split(/\n\s*\n/g)
    .map((section) => section.trim())
    .filter(Boolean)
    .slice(0, 200)
    .map((section, index) => ({
      title: index === 0 ? 'Overview' : `Section ${index + 1}`,
      content: section,
    }));
}

function extractText({ fileType, buffer, content }) {
  const text = content || safeTextFromBuffer(buffer || Buffer.alloc(0));

  switch (fileType) {
    case 'HTML':
      return stripHtml(text);
    case 'CSV':
    case 'XLSX':
      return normalizeWhitespace(text.replace(/[;,]/g, ' '));
    case 'DOCX':
    case 'PPTX':
      return stripHtml(text.replace(/<[^>]+>/g, ' '));
    case 'PDF':
      return normalizeWhitespace(
        text
          .replace(/%PDF-\d\.\d/g, ' ')
          .replace(/\bendobj\b|\bstream\b|\bendstream\b/g, ' ')
      );
    case 'MD':
    case 'Markdown':
    case 'TXT':
    default:
      return normalizeWhitespace(text);
  }
}

function scoreQuality({ text, metadata, sections }) {
  const checks = [
    Boolean(metadata.title),
    Boolean(metadata.category),
    Boolean(metadata.owner || metadata.author),
    Boolean(metadata.language && metadata.language !== 'unknown'),
    Array.isArray(metadata.tags) && metadata.tags.length > 0,
    text.length > 120,
    sections.length > 0,
    Boolean(metadata.aiVisibility),
  ];
  return Number(((checks.filter(Boolean).length / checks.length) * 100).toFixed(1));
}

export class DocumentIngestionService {
  constructor({
    maxFileBytes = 25 * 1024 * 1024,
    maxChunksPerDocument = env.vectorMaxChunksPerDocument || 500,
  } = {}) {
    this.maxFileBytes = maxFileBytes;
    this.maxChunksPerDocument = maxChunksPerDocument;
  }

  validate({ filename = '', fileType = '', mimeType = '', byteSize = 0, contentLength = 0 } = {}) {
    const normalizedFileType = normalizeFileType(fileType, filename);
    const extension = extensionFromName(filename);
    const expectedMimes = MIME_BY_EXTENSION[extension] || [];
    const errors = [];

    if (!SUPPORTED_INGESTION_TYPES.has(normalizedFileType)) {
      errors.push(`Unsupported document type: ${normalizedFileType}`);
    }

    if (Number(byteSize || contentLength || 0) > this.maxFileBytes) {
      errors.push(`File exceeds ${this.maxFileBytes} bytes`);
    }

    if (
      mimeType &&
      expectedMimes.length &&
      !expectedMimes.includes(mimeType) &&
      !mimeType.startsWith('text/')
    ) {
      errors.push(`MIME ${mimeType} does not match ${extension || normalizedFileType}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      fileType: normalizedFileType,
      extension,
      expectedMimes,
    };
  }

  ingestDocument(document, source = {}) {
    const filename = document.sourceFileName || source.filename || `${document.id}.txt`;
    const fileType = normalizeFileType(document.fileType, filename);
    const buffer = source.buffer || Buffer.from(source.contentBase64 || '', 'base64');
    const rawContent = source.content || document.content || safeTextFromBuffer(buffer);
    const validation = this.validate({
      filename,
      fileType,
      mimeType: document.mimeType || source.mimeType,
      byteSize: document.byteSize || buffer.byteLength || rawContent.length,
      contentLength: rawContent.length,
    });

    if (!validation.valid) {
      return {
        processingStatus: 'failed',
        errors: validation.errors,
        fileType,
        content: '',
        sections: [],
        chunks: [],
        keywords: [],
        language: document.language || 'unknown',
        summary: '',
        contentHash: '',
        qualityScore: 0,
      };
    }

    const content = extractText({ fileType, buffer, content: rawContent });
    const sections = buildSections({ fileType, content });
    const language = document.language || detectLanguage(content);
    const keywords = Array.from(
      new Set([...(document.tags || []), ...extractKeywords(content, 18)])
    ).slice(0, 24);
    const summary = summarize(content);
    const metadata = {
      title: document.title,
      category: document.category,
      owner: document.owner,
      author: document.author,
      language,
      tags: document.tags || [],
      aiVisibility: document.aiVisibility !== false,
    };

    return {
      processingStatus: content ? 'ready' : 'failed',
      errors: content ? [] : ['No readable text extracted from document.'],
      fileType,
      content,
      sections,
      keywords,
      language,
      summary,
      contentHash: contentHash(content),
      qualityScore: scoreQuality({ text: content, metadata, sections }),
    };
  }
}

export {
  buildSections,
  contentHash,
  detectLanguage,
  extractKeywords,
  extractText,
  normalizeFileType,
  safeTextFromBuffer,
};
