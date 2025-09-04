// const connectDB = require('./config/db');
// const { processXML } = require('./services/xmlService');

// const XML_URL = 'http://34.143.212.124:90/hdpapi/v1/connections/odata/hdp_demo'; // Replace with your XML URL

// const run = async () => {
//     await connectDB();
//     await processXML(XML_URL);
//     process.exit(0);
// };

// run();

const connectDB = require('./config/db');
const { processXML } = require('./services/xmlService');

const XML_URL = process.argv[2]; // Get URL from command line

if (!XML_URL) {
    console.error('Please provide the XML URL as an argument');
    process.exit(1);
}

const run = async () => {
    await connectDB();
    await processXML(XML_URL);
    process.exit(0);
};

run();
