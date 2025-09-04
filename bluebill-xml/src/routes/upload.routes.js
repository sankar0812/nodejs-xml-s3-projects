const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { uploadXML, uploadXMLFromUrl } = require('../controllers/upload.controller');


const router = express.Router();
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });


const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});


const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });


router.post('/xml-file', upload.single('file'), uploadXML);

router.post('/xml-url', uploadXMLFromUrl)


module.exports = router;