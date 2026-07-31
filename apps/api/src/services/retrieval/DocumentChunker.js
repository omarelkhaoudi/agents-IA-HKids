import { env } from '../../config/env.js';
import { buildSections, contentHash, extractKeywords } from './DocumentIngestionService.js';

function estimateTokens(content) {
  return Math.max(1, Math.ceil(String(content || '').trim().length / 4));
}

function normalizeType(type) {
  const value = String(type || '').toUpperCase();
  if (value === 'MARKDOWN') return 'MD';
  return value;
}

function splitIntoLogicalUnits(type, content) {
  const normalized = String(content || '').replace(/\r\n/g, '\n').trim();

  switch (normalizeType(type)) {
    case 'CSV':
    case 'XLSX':
      return normalized
        .split('\n')
        .filter(Boolean)
        .map((line) => line.trim());
    case 'MD':
      return normalized
        .split(/\n(?=#|\*|-|\d+\.)/g)
        .map((block) => block.trim())
        .filter(Boolean);
    case 'HTML':
      return normalized
        .split(/\n\s*\n|(?<=\.)\s+(?=[A-Z])/g)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    case 'PDF':
    case 'DOCX':
    case 'PPTX':
    case 'TXT':
    default:
      return normalized
        .split(/\n\s*\n/g)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
  }
}

function chunkUnits(units, { chunkSize, overlap }) {
  const chunks = [];
  let currentChunk = '';

  units.forEach((unit) => {
    const nextChunk = currentChunk ? `${currentChunk}\n\n${unit}` : unit;

    if (nextChunk.length <= chunkSize) {
      currentChunk = nextChunk;
      return;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
      currentChunk = `${currentChunk.slice(-overlap)}\n${unit}`.trim();
      return;
    }

    for (let offset = 0; offset < unit.length; offset += Math.max(1, chunkSize - overlap)) {
      chunks.push(unit.slice(offset, offset + chunkSize));
    }
    currentChunk = '';
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter(Boolean);
}

export class DocumentChunker {
  constructor({
    chunkSize = env.vectorChunkSize || 1400,
    overlap = env.vectorChunkOverlap || 180,
    maxChunks = env.vectorMaxChunksPerDocument || 500,
  } = {}) {
    this.chunkSize = Math.max(200, Number(chunkSize) || 1400);
    this.overlap = Math.min(Math.max(0, Number(overlap) || 0), this.chunkSize - 1);
    this.maxChunks = Math.max(1, Number(maxChunks) || 500);
  }

  chunk(document, rawContent, ingestion = {}) {
    if (document.aiVisibility === false) {
      return [];
    }

    const sections =
      ingestion.sections?.length > 0
        ? ingestion.sections
        : buildSections({ fileType: document.fileType, content: rawContent });
    const chunks = [];
    let chunkNumber = 1;

    for (const section of sections) {
      const sectionContent = section.content || section;
      const units = splitIntoLogicalUnits(document.fileType, sectionContent);
      const sectionChunks = chunkUnits(units, {
        chunkSize: this.chunkSize,
        overlap: this.overlap,
      });

      for (const content of sectionChunks) {
        if (chunks.length >= this.maxChunks) {
          break;
        }

        chunks.push({
          id: `${document.id}-chunk-${chunkNumber}`,
          documentId: document.id,
          chunkNumber,
          sectionTitle: section.title || `Section ${chunkNumber}`,
          content,
          contentHash: contentHash(content),
          estimatedTokens: estimateTokens(content),
          tokenCount: estimateTokens(content),
          charCount: content.length,
          keywords: extractKeywords(content, 12),
          language: ingestion.language || document.language || 'unknown',
          summary: String(content).slice(0, 220),
          aiVisibility: document.aiVisibility !== false,
          qualityScore: Number(document.qualityScore || ingestion.qualityScore || 0),
          freshnessScore: 0,
          metadata: {
            title: document.title,
            category: document.category,
            tags: document.tags || [],
            type: document.fileType,
            author: document.author,
            owner: document.owner,
            collectionId: document.collectionId || null,
            securityClassification: document.securityClassification || 'internal',
            createdDate: document.createdDate,
            updatedDate: document.updatedDate,
            sectionTitle: section.title || '',
            contentHash: contentHash(content),
          },
        });
        chunkNumber += 1;
      }

      if (chunks.length >= this.maxChunks) {
        break;
      }
    }

    return chunks;
  }
}

export { estimateTokens };
