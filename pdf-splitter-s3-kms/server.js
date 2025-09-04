require('dotenv').config();
const express = require('express');
const multer = require('multer');
const dayjs = require('dayjs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PDFDocument } = require('pdf-lib');
const { parse } = require('csv-parse/sync');
const pLimit = require('p-limit');

// pdf.js (Node build)
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1024 } }); // up to ~1GB

// --- AWS S3 client
const s3 = new S3Client({ 
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
 });


const cfg = {
  bucket: process.env.S3_BUCKET,
  prefix: process.env.S3_PREFIX || 'dev',
  sse: process.env.SSE,
  kmsKeyId: process.env.KMS_KEY_ID,
};

// Helper: upload to S3
async function putToS3(key, body) {
  const params = {
    Bucket: cfg.bucket,
    Key: key,
    Body: body,
    ContentType: 'application/pdf',
    Tagging: `retention=${process.env.RETENTION_TIER || 'hot'}`,
  };
  if (cfg.sse === 'KMS') {
    params.ServerSideEncryption = 'aws:kms';
    if (cfg.kmsKeyId) params.SSEKMSKeyId = cfg.kmsKeyId;
  } else {
    params.ServerSideEncryption = 'AES256';
  }
  await s3.send(new PutObjectCommand(params));
}

// Extract customerId from a single page (text-based)
async function extractCustomerIdFromPage(pdfData, pageIndex) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  const text = content.items.map(i => i.str).join(' ');
  const m = text.match(/Customer ID:\s*([A-Z0-9-]+)/i);
  await pdf.cleanup();
  return m ? m[1] : null;
}

// Build groups of consecutive pages per customer
async function groupPagesByCustomer(pdfBytes) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;
  const groups = []; // [{ customerId, start, end }]
  let current = null;

  for (let i = 0; i < total; i++) {
    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    const text = content.items.map(it => it.str).join(' ');
    const m = text.match(/Customer ID:\s*([A-Z0-9-]+)/i);
    const cid = m ? m[1] : 'UNKNOWN';

    if (!current) current = { customerId: cid, start: i + 1, end: i + 1 };
    else if (current.customerId === cid) current.end = i + 1;
    else { groups.push(current); current = { customerId: cid, start: i + 1, end: i + 1 }; }
  }
  if (current) groups.push(current);
  await pdf.cleanup();
  return groups;
}

// Split pages (start..end) into a new PDF Buffer with pdf-lib
async function slicePdf(pdfBytes, startPage, endPage) {
  const src = await PDFDocument.load(pdfBytes);
  const dst = await PDFDocument.create();
  const indices = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage - 1 + i);
  const copied = await dst.copyPages(src, indices);
  copied.forEach(p => dst.addPage(p));
  return await dst.save(); // Buffer (Uint8Array)
}

// POST /split
// - multipart form fields:
//   file: the big PDF (required)
//   mapping: CSV (optional) — if present, uses mapping; else tries in-PDF detection
//   env: optional (overrides S3_PREFIX)
//   date: optional ISO date to use in path; default today
app.post('/upload', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'mapping', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files?.file?.[0]) return res.status(400).json({ error: 'file is required' });

    const pdfBytes = req.files.file[0].buffer;
    const today = req.body.date ? dayjs(req.body.date) : dayjs();
    const folderDate = today.format('YYYY-MM-DD');
    const envPrefix = (req.body.env || cfg.prefix).replace(/\/+$/,'');
    let groups;

    if (req.files.mapping?.[0]) {
      // External mapping CSV mode
      const csv = req.files.mapping[0].buffer.toString('utf8');
      const rows = parse(csv, { columns: true, skip_empty_lines: true });
      groups = rows.map(r => ({
        customerId: String(r.customer_id).trim(),
        start: Number(r.start_page),
        end: Number(r.end_page),
      })).sort((a,b) => a.start - b.start);
    } else {
      // In-PDF detection mode
      groups = await groupPagesByCustomer(pdfBytes);
    }

    // Concurrency for S3 uploads
    const limit = pLimit(5);
    let counters = {}; // per-customer sequence
    const tasks = [];

    for (const g of groups) {
      counters[g.customerId] = counters[g.customerId] || 0;
      counters[g.customerId]++;

      tasks.push(limit(async () => {
        const part = await slicePdf(pdfBytes, g.start, g.end);
        const seq = String(counters[g.customerId]).padStart(3, '0');
        const key = `${envPrefix}/${g.customerId}/${folderDate}/doc-${g.customerId}-${seq}.pdf`;
        await putToS3(key, part);
        return { key, pages: g.end - g.start + 1, customerId: g.customerId };
      }));
    }

    const results = await Promise.all(tasks);
    res.json({ uploaded: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'internal error' });
  }
});

// Health
app.get('/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`PDF splitter listening on :${port}`));
