const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const uploadRoutes = require('./routes/upload.routes');
const reportRoutes = require('./routes/reports.routes');


const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));


app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/upload', uploadRoutes);
app.use('/reports', reportRoutes);


module.exports = app;