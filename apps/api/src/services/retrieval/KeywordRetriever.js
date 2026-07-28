function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, ' ');
}

function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function countMatches(content, keywords) {
  const haystack = normalize(content);
  return keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
}

export class KeywordRetriever {
  retrieve(query, indexedDocuments) {
    const keywords = tokenize(query);

    return indexedDocuments.flatMap((document) =>
      document.chunks
        .map((chunk) => {
          const contentMatches = countMatches(chunk.content, keywords);
          const titleMatches = countMatches(document.title, keywords);
          const tagMatches = countMatches(document.tags.join(' '), keywords);
          const categoryMatches = countMatches(document.category, keywords);
          const metadataMatches = countMatches(
            `${document.author} ${document.fileType} ${document.description}`,
            keywords
          );

          return {
            chunk,
            document,
            matchSignals: {
              contentMatches,
              titleMatches,
              tagMatches,
              categoryMatches,
              metadataMatches,
            },
            baseScore:
              contentMatches + titleMatches * 2 + tagMatches * 2 + categoryMatches + metadataMatches,
          };
        })
        .filter((candidate) => candidate.baseScore > 0)
    );
  }
}
