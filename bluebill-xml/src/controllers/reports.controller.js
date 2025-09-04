const { salesByDay, topProducts, customerLTV } = require('../services/report.service');
const { toCSV, toExcel, toPDF } = require('../services/export.service');
const fs = require('fs');

function parseRange(q) {
  const from = q.from ? new Date(String(q.from)) : undefined;
  const to = q.to ? new Date(String(q.to)) : undefined;
  return { from, to };
}

async function getSalesByDay(req, res) {
  try {
    const { from, to } = parseRange(req.query);
    const rows = await salesByDay(from, to);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTopProducts(req, res) {
  try {
    const { from, to } = parseRange(req.query);
    const limit = Number(req.query.limit || 10);
    const rows = await topProducts(limit, from, to);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getCustomerLTV(req, res) {
  try {
    const limit = Number(req.query.limit || 20);
    const rows = await customerLTV(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function exportReport(req, res) {
  try {
    const type = String(req.query.type || 'csv');
    const name = String(req.query.name || 'salesByDay');
    const { from, to } = parseRange(req.query);

    let rows = [];
    if (name === 'salesByDay') rows = await salesByDay(from, to);
    else if (name === 'topProducts') rows = await topProducts(Number(req.query.limit || 10), from, to);
    else if (name === 'customerLTV') rows = await customerLTV(Number(req.query.limit || 20));
    else return res.status(400).json({ error: 'Unknown report name' });

    if (type === 'csv') {
      const csv = toCSV(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=\"${name}.csv\"`);
      return res.send(csv);
    }

    if (type === 'excel') {
      const file = await toExcel(rows, name);
      const stream = fs.createReadStream(file);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=\"${name}.xlsx\"`);
      return stream.pipe(res);
    }

    if (type === 'pdf') {
      const file = await toPDF(rows, name);
      const stream = fs.createReadStream(file);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=\"${name}.pdf\"`);
      return stream.pipe(res);
    }

    return res.status(400).json({ error: 'Unknown export type' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getSalesByDay, getTopProducts, getCustomerLTV, exportReport };
