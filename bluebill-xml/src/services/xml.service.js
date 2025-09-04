const fs = require('fs').promises;
const { XMLParser } = require('fast-xml-parser');
const validator = require('xsd-schema-validator');


const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: true, parseAttributeValue: true });


async function parseXMLFile(xmlPath) {
    const xml = await fs.readFile(xmlPath, 'utf8');
    return parser.parse(xml);
}


function validateAgainstXSD(xmlPath, xsdPath) {
    if (!xsdPath) return Promise.resolve({ valid: true });
    return new Promise((resolve) => {
        validator.validateXML({ file: xmlPath }, xsdPath, (err, result) => {
            if (err) return resolve({ valid: false, errors: err.message });
            return resolve({ valid: result.valid, errors: result.messages && result.messages.join('\n') });
        });
    });
}


module.exports = { parseXMLFile, validateAgainstXSD };