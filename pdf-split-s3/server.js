// const express = require('express');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const { PDFDocument } = require('pdf-lib');
// const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
// const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// const app = express();
// const PORT = 3000;

// // AWS S3 Client v3
// const s3 = new S3Client({
//     region: "ap-south-1",
//     credentials: {
//         accessKeyId: "AKIAX2DZEMCTHWU2PBFD",
//         secretAccessKey: "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"
//     }
// });

// const bucketName = "";

// // Multer setup for file upload
// const upload = multer({ dest: 'uploads/' });

// // Load client page ranges
// const clientData = JSON.parse(fs.readFileSync('clientPages.json', 'utf-8'));

// // Admin upload API
// app.post('/admin/upload', upload.single('pdf'), async (req, res) => {
//     try {
//         if (!req.file) return res.status(400).send('No file uploaded');

//         const masterPath = req.file.path;
//         const masterPdfBytes = fs.readFileSync(masterPath);
//         const masterPdf = await PDFDocument.load(masterPdfBytes);
//         const totalPages = masterPdf.getPageCount();

//         for (const client of clientData) {
//             const newPdf = await PDFDocument.create();
//             const pages = Array.from(
//                 { length: client.endPage - client.startPage + 1 },
//                 (_, i) => i + client.startPage
//             );

//             for (const pageNum of pages) {
//                 if (pageNum <= totalPages) {
//                     const [copiedPage] = await newPdf.copyPages(masterPdf, [pageNum - 1]);
//                     newPdf.addPage(copiedPage);
//                 }
//             }

//             const clientPdfBytes = await newPdf.save();
//             const clientPdfName = `${client.clientId}.pdf`;
//             const clientPdfPath = path.join('uploads', clientPdfName);
//             fs.writeFileSync(clientPdfPath, clientPdfBytes);

//             // Upload to S3 using AWS SDK v3
//             await s3.send(new PutObjectCommand({
//                 Bucket: bucketName,
//                 Key: `clients/${clientPdfName}`,
//                 Body: fs.createReadStream(clientPdfPath),
//                 ContentType: 'application/pdf'
//             }));

//             console.log(`${clientPdfName} uploaded to S3`);
//         }

//         fs.unlinkSync(masterPath);
//         res.send('Master PDF split and uploaded successfully for all clients!');
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error processing PDF');
//     }
// });

// // Client download API
// app.get('/download/:clientId', async (req, res) => {
//     try {
//         const clientId = req.params.clientId;
//         const command = new GetObjectCommand({
//             Bucket: bucketName,
//             Key: `clients/${clientId}.pdf`
//         });

//         const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
//         res.redirect(url);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error generating download link');
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
// });


// -------------------------------------------------------------------------------------------------------------


const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { PDFDocument } = require("pdf-lib");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// AWS S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Save file locally
async function saveToLocal(buffer, key) {
  const filePath = path.join(__dirname, "uploads", key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  console.log(`💾 Saved locally: ${filePath}`);
}

// Upload to S3
async function uploadToS3(buffer, key) {
  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf",
  };
  await s3.send(new PutObjectCommand(params));
  console.log(`✅ Uploaded ${key}`);
}

// Extract client ranges dynamically
async function findClientRanges(pdfBuffer) {
  const data = await pdfParse(pdfBuffer);
  const pages = data.text.split("\f"); // split by page

  console.log("📝 RAW PDF TEXT SAMPLE:");
  console.log(pages.slice(0, 2)); // first 2 pages preview

  let clientRanges = [];
  let currentClient = null;

  pages.forEach((pageText, index) => {
    console.log(`🔎 Page ${index + 1} text preview:`, pageText.substring(0, 200));

    // 👇 Updated regex to capture full names
    const match = pageText.match(/Client Name:\s*(.+)/i);
    if (match) {
      if (currentClient) {
        currentClient.end = index;
        clientRanges.push(currentClient);
      }
      currentClient = {
        name: match[1].trim().replace(/\s+/g, "_"),
        start: index + 1,
      };
    }
  });

  if (currentClient) {
    currentClient.end = pages.length;
    clientRanges.push(currentClient);
  }

  return clientRanges;
}

// Split and upload each client
async function splitAndUpload(pdfBuffer, clientRanges) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  for (const client of clientRanges) {
    const newPdf = await PDFDocument.create();

    for (let i = client.start - 1; i < client.end; i++) {
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    const key = `clients/${client.name}.pdf`;

    await uploadToS3(Buffer.from(pdfBytes), key);
    await saveToLocal(Buffer.from(pdfBytes), key);
  }
}

// Upload API
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    const pdfBuffer = req.file.buffer;
    const clientRanges = await findClientRanges(pdfBuffer);

    console.log("📌 Client Ranges:", clientRanges);

    if (clientRanges.length === 0)
      return res.status(400).send("No clients found in PDF");

    await splitAndUpload(pdfBuffer, clientRanges);

    res.send("PDF split by client and uploaded to S3 + saved locally");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing PDF");
  }
});

// Download API
app.get("/download/:client", async (req, res) => {
  try {
    const clientName = req.params.client;
    const key = `clients/${clientName}.pdf`;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
    });

    const { Body } = await s3.send(command);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${clientName}.pdf`);
    Body.pipe(res);

    // Alternative: signed URL
    // const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    // res.json({ downloadUrl: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "File not found or download failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
