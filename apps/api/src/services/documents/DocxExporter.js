import { Document, Packer, Paragraph, TextRun } from 'docx';

export class DocxExporter {
  async export(documentRecord) {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: documentRecord.structuredDocument.title, bold: true, size: 32 })],
            }),
            new Paragraph(`Reference: ${documentRecord.structuredDocument.reference}`),
            ...documentRecord.structuredDocument.sections.flatMap((section) => [
              new Paragraph({
                children: [new TextRun({ text: section.heading, bold: true })],
              }),
              new Paragraph(section.content.replace(/<[^>]+>/g, '')),
            ]),
          ],
        },
      ],
    });

    return {
      fileName: `${documentRecord.structuredDocument.reference}.docx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: await Packer.toBuffer(doc),
    };
  }
}
