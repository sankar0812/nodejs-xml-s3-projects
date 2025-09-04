const axios = require('axios');
const xml2js = require('xml2js');
const DataModel = require('../models/Data');

// Fetch XML from URL
const fetchXMLData = async (url) => {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (err) {
        console.error('Error fetching XML:', err);
        throw err;
    }
};

// Parse XML to JSON
const parseXML = async (xmlData) => {
    const parser = new xml2js.Parser({ explicitArray: false });
    try {
        const result = await parser.parseStringPromise(xmlData);
        return result;
    } catch (err) {
        console.error('Error parsing XML:', err);
        throw err;
    }
};

// Save JSON to MongoDB
const saveToMongo = async (jsonData) => {
    try {
        const doc = new DataModel(jsonData);
        await doc.save();
        console.log('Data saved to MongoDB');
    } catch (err) {
        console.error('Error saving to MongoDB:', err);
    }
};

// Main function to fetch, parse, and save
const processXML = async (url) => {
    const xmlData = await fetchXMLData(url);
    const jsonData = await parseXML(xmlData);
    await saveToMongo(jsonData);
};

module.exports = { processXML };
