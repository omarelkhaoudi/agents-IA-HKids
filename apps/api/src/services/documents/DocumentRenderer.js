function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class DocumentRenderer {
  render({ structuredDocument, companyProfile }) {
    const sectionsHtml = structuredDocument.sections
      .map(
        (section) => `
          <section class="doc-section">
            <h2>${escapeHtml(section.heading)}</h2>
            <div class="doc-content">${section.content}</div>
          </section>
        `
      )
      .join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 40px; }
            .page { max-width: 900px; margin: 0 auto; background: white; }
            header, footer { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
            footer { border-top: 1px solid #e2e8f0; border-bottom: none; padding-top: 16px; margin-top: 32px; }
            h1 { margin: 0 0 8px; }
            h2 { font-size: 18px; margin: 0 0 12px; }
            .meta { color: #475569; font-size: 14px; }
            .doc-section { page-break-inside: avoid; margin-bottom: 24px; }
            .doc-content { white-space: pre-wrap; line-height: 1.7; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="page">
            <header>
              <h1>${escapeHtml(structuredDocument.title)}</h1>
              <div class="meta">${escapeHtml(companyProfile.companyName)} | ${escapeHtml(structuredDocument.reference)} | ${escapeHtml(structuredDocument.language)}</div>
            </header>
            ${sectionsHtml}
            <footer>
              <div class="meta">${escapeHtml(companyProfile.companyName)} | ${escapeHtml(companyProfile.companyAddress)}</div>
            </footer>
          </div>
        </body>
      </html>
    `;
  }
}
