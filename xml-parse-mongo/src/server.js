require('dotenv').config();
const app = require('./app');
const { connectMongo } = require('./loaders/mongoose');


const port = Number(process.env.PORT || 3000);
(async function start() {
try {
await connectMongo(process.env.MONGODB_URI);
app.listen(port, () => console.log(`Bluebill API listening on :${port}`));
} catch (err) {
console.error('Failed to start', err);
process.exit(1);
}
})();