const mongoose = require('mongoose');

// Flexible schema for XML data
const dataSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('Data', dataSchema);
