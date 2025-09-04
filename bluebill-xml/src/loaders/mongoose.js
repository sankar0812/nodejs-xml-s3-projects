const mongoose = require('mongoose');


async function connectMongo(uri) {
if (!uri) throw new Error('MONGODB_URI not set');
mongoose.set('strictQuery', true);
await mongoose.connect(uri, {});
console.log('Connected to MongoDB');
}


module.exports = { connectMongo };