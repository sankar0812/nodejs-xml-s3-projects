// node scripts/generate-sample-pdf.js
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function main() {
  const customers = Array.from({ length: 5 }, (_, i) => `CUST-${String(i + 1).padStart(4, '0')}`);
  const pagesPerCustomer = 5; // adjust to simulate 500+ pages easily
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let pageNum = 1;
  for (const cust of customers) {
    for (let p = 0; p < pagesPerCustomer; p++) {
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();

      page.drawText(`Customer ID: ${cust}`, { x: 50, y: height - 50, size: 14, font, color: rgb(0, 0, 0) });
      page.drawText(`Statement Page ${p + 1} of ${pagesPerCustomer}`, { x: 50, y: height - 70, size: 12, font });
      page.drawLine({ start: { x: 50, y: height - 80 }, end: { x: width - 50, y: height - 80 }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(`(Body content for ${cust}, page ${p + 1})`, { x: 50, y: height - 120, size: 11, font });
      page.drawText(`GLOBAL PAGE #: ${pageNum++}`, { x: width - 180, y: 30, size: 9, font, color: rgb(0.2,0.2,0.2) });
    }
  }
  const bytes = await pdfDoc.save();
  fs.writeFileSync('sample-bulk.pdf', bytes);
  console.log('Wrote sample-bulk.pdf');
}
main();
