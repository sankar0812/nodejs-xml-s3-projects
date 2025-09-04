const Order = require('../models/Order');


async function salesByDay(from, to) {
    const match = {};
    if (from || to) match.orderDate = {};
    if (from) match.orderDate.$gte = from;
    if (to) match.orderDate.$lte = to;


    return Order.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateTrunc: { date: '$orderDate', unit: 'day' } },
                orders: { $sum: 1 },
                revenue: { $sum: '$grandTotal' },
                tax: { $sum: '$taxTotal' }
            }
        },
        { $project: { _id: 0, date: '$_id', orders: 1, revenue: 1, tax: 1 } },
        { $sort: { date: 1 } }
    ]).exec();
}


async function topProducts(limit = 10, from, to) {
    const match = {};
    if (from || to) match.orderDate = {};
    if (from) match.orderDate.$gte = from;
    if (to) match.orderDate.$lte = to;


    return Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.sku',
                name: { $first: '$items.name' },
                qty: { $sum: '$items.qty' },
                revenue: { $sum: '$items.total' }
            }
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
        { $project: { _id: 0, sku: '$_id', name: 1, qty: 1, revenue: 1 } }
    ]).exec();
}


async function customerLTV(limit = 20) {
    return Order.aggregate([
        {
            $group: {
                _id: '$customer.email',
                name: { $first: '$customer.name' },
                orders: { $sum: 1 },
                revenue: { $sum: '$grandTotal' }
            }
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
        { $project: { _id: 0, email: '$_id', name: 1, orders: 1, revenue: 1 } }
    ]).exec();
}


module.exports = { salesByDay, topProducts, customerLTV };