const mongoose = require('mongoose');
const { Schema } = mongoose;


const LineItem = new Schema({
sku: { type: String, index: true },
name: String,
qty: Number,
price: Number,
tax: Number,
total: Number
}, { _id: false });


const OrderSchema = new Schema({
orderId: { type: String, required: true, unique: true, index: true },
orderDate: { type: Date, index: true },
currency: { type: String, default: 'USD' },
customer: {
code: { type: String, index: true },
name: String,
email: String,
phone: String,
address: {
line1: String, line2: String, city: String, state: String, postal: String, country: String
}
},
items: [LineItem],
subTotal: Number,
taxTotal: Number,
grandTotal: Number,
raw: { type: Object }
}, { timestamps: true });


module.exports = mongoose.model('Order', OrderSchema);