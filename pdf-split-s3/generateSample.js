const PDFDocument = require('pdfkit');
const fs = require('fs');

function createSamplePDF(filename) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filename));

  for (let i = 1; i <= 20; i++) {
    doc.fontSize(20).text(`Client Data Page ${i}`, 100, 100);
    doc.fontSize(14).text(`This is some sample text for page ${i}. Belongs to client group...`);
    doc.addPage();
  }

  doc.end();
}

createSamplePDF('master.pdf');
console.log('Sample 20-page PDF created: master.pdf');
