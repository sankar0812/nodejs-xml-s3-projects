const { Router } = require('express');
const { getCustomerLTV, getSalesByDay, getTopProducts, exportReport } = require('../controllers/reports.controller');


const router = Router();

// GET /reports/sales-by-day?from=2024-01-01&to=2024-02-01
router.get('/sales-by-day', getSalesByDay);


// GET /reports/top-products?limit=5&from=2024-01-01&to=2024-02-01
router.get('/top-products', getTopProducts);


// GET /reports/customer-ltv?limit=20
router.get('/customer-ltv', getCustomerLTV);

// Export any report
// Example: /reports/export?name=salesByDay&type=csv
// Supported names: salesByDay, topProducts, customerLTV
// Supported types: csv, excel, pdf
router.get('/export', exportReport);


module.exports = router;