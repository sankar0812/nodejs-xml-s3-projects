const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// --- CSV Export ---
function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const parser = new Parser();
  return parser.parse(rows);
}

// --- Excel Export ---
async function toExcel(rows, name) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(name);

  if (rows.length > 0) {
    worksheet.columns = Object.keys(rows[0]).map((key) => ({
      header: key,
      key,
      width: 20
    }));
    rows.forEach((row) => worksheet.addRow(row));
  }

  const filePath = path.join(__dirname, `../../tmp/${name}.xlsx`);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

// --- PDF Export ---
async function toPDF(rows, name) {
  const filePath = path.join(__dirname, `../../tmp/${name}.pdf`);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]).join(' | ');
      doc.text(headers);
      doc.moveDown();

      rows.forEach((row) => {
        const line = Object.values(row).join(' | ');
        doc.text(line);
      });
    } else {
      doc.text('No data available.');
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { toCSV, toExcel, toPDF };
