// const path = require('path');
// const Order = require('../models/Order');
// const { parseXMLFile, validateAgainstXSD } = require('../services/xml.service');
// const { buildOrderDTO } = require('../validation/orderSchema');


// async function uploadXML(req, res) {
//     try {
//         const file = req.file;
//         if (!file) return res.status(400).json({ error: 'No file uploaded' });


//         const xsdPath = process.env.ORDER_XSD;
//         const validation = await validateAgainstXSD(file.path, xsdPath);
//         if (!validation.valid) return res.status(422).json({ error: 'XSD validation failed', details: validation.errors });


//         const parsed = await parseXMLFile(file.path);
//         const dto = buildOrderDTO(parsed);


//         // upsert by orderId
//         const existing = await Order.findOne({ orderId: dto.orderId });
//         let order;
//         if (existing) {
//             order = await Order.findOneAndUpdate({ orderId: dto.orderId }, { ...dto, raw: parsed }, { new: true });
//         } else {
//             order = await Order.create({ ...dto, raw: parsed });
//         }


//         return res.json({ ok: true, id: order._id, orderId: order.orderId });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ error: String(err) });
//     }
// }


// module.exports = { uploadXML };


const Order = require('../models/Order');
const { parseXMLFile } = require('../services/xml.service');
const { buildOrderDTO } = require('../validation/orderSchema');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');


const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: true,
  parseAttributeValue: true,
});

async function uploadXML(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // ✅ Parse XML into JSON
    const parsed = await parseXMLFile(file.path);

    // ✅ Convert into DTO
    const dto = buildOrderDTO(parsed);

    // ✅ Upsert order by orderId
    let order = await Order.findOneAndUpdate(
      { orderId: dto.orderId },
      { ...dto, raw: parsed },
      { new: true, upsert: true }
    );

    return res.json({
      ok: true,
      id: order._id,
      orderId: order.orderId,
    });
  } catch (err) {
    console.error('Upload XML failed:', err);
    return res.status(500).json({ error: 'Server error', details: String(err) });
  }
}

async function uploadXMLFromUrl(req, res) {
    try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    const response = await axios.get(url, { responseType: 'text' });
    const xmlData = response.data;

    const parsed = parser.parse(xmlData);
    const dto = buildOrderDTO(parsed);

    let order = await Order.findOneAndUpdate(
      { orderId: dto.orderId },
      { ...dto, raw: parsed },
      { new: true, upsert: true }
    );

    return res.json({ ok: true, id: order._id, orderId: order.orderId });
  } catch (err) {
    console.error('Upload XML from URL failed:', err);
    return res.status(500).json({ error: 'Server error', details: String(err) });
  }
}

module.exports = { uploadXML, uploadXMLFromUrl };
