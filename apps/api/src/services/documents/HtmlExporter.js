export class HtmlExporter {
  export(documentRecord) {
    return {
      fileName: `${documentRecord.structuredDocument.reference}.html`,
      mimeType: 'text/html',
      content: Buffer.from(documentRecord.renderedPreview, 'utf-8'),
    };
  }
}
