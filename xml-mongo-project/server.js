const express = require('express');
const connectDB = require('./config/db');
const { processXML } = require('./services/xmlService');

const app = express();
app.use(express.json());

app.post('/save-xml', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send('URL is required');

    try {
        await processXML(url);
        res.send('XML data fetched and saved to MongoDB!');
    } catch (err) {
        res.status(500).send('Error processing XML');
    }
});

const PORT = 3001;
connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
