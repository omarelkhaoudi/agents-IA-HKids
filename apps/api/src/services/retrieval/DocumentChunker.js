function estimateTokens(content) {
  return Math.max(1, Math.ceil(content.trim().length / 4));
}

function splitIntoLogicalUnits(type, content) {
  const normalized = content.replace(/\r\n/g, '\n').trim();

  switch (type) {
    case 'CSV':
      return normalized
        .split('\n')
        .filter(Boolean)
        .map((line) => line.trim());
    case 'Markdown':
      return normalized
        .split(/\n(?=#|\*|-|\d+\.)/g)
        .map((block) => block.trim())
        .filter(Boolean);
    case 'PDF':
    case 'DOCX':
    case 'TXT':
    default:
      return normalized
        .split(/\n\s*\n/g)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
  }
}

export class DocumentChunker {
  constructor({ chunkSize = 420, overlap = 60 } = {}) {
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }

  chunk(document, rawContent) {
    const units = splitIntoLogicalUnits(document.fileType, rawContent);
    const chunks = [];
    let currentChunk = '';

    units.forEach((unit) => {
      const nextChunk = currentChunk ? `${currentChunk}\n\n${unit}` : unit;

      if (nextChunk.length <= this.chunkSize) {
        currentChunk = nextChunk;
        return;
      }

      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = `${currentChunk.slice(-this.overlap)}\n${unit}`.trim();
      } else {
        chunks.push(unit.slice(0, this.chunkSize));
        currentChunk = unit.slice(Math.max(0, this.chunkSize - this.overlap));
      }
    });

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.map((content, index) => ({
      id: `${document.id}-chunk-${index + 1}`,
      documentId: document.id,
      chunkNumber: index + 1,
      content,
      estimatedTokens: estimateTokens(content),
      metadata: {
        title: document.title,
        category: document.category,
        tags: document.tags,
        type: document.fileType,
        author: document.author,
        createdDate: document.createdDate,
        updatedDate: document.updatedDate,
      },
    }));
  }
}
