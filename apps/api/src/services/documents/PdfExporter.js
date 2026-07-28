import { PDFDocument, StandardFonts } from 'pdf-lib';

export class PdfExporter {
  async export(documentRecord) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const lines = [
      documentRecord.structuredDocument.title,
      `Reference: ${documentRecord.structuredDocument.reference}`,
      '',
      ...documentRecord.structuredDocument.sections.flatMap((section) => [
        section.heading,
        section.content.replace(/<[^>]+>/g, ''),
        '',
      ]),
    ];

    let cursorY = 800;
    lines.forEach((line) => {
      page.drawText(line.slice(0, 100), {
        x: 50,
        y: cursorY,
        size: 11,
        font,
      });
      cursorY -= 16;
    });

    return {
      fileName: `${documentRecord.structuredDocument.reference}.pdf`,
      mimeType: 'application/pdf',
      content: Buffer.from(await pdf.save()),
    };
  }
}
