// Minimal runtime validation helpers. Keep simple — you can swap in joi/zod if you want.

function coerceNumber(v) {
    if (v === undefined || v === null || v === '') return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
}


function buildOrderDTO(parsed) {
    const o = parsed.Order || parsed;
    const rawItems = (o.Items && o.Items.Item) || [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];


    return {
        orderId: String(o.Id || o.OrderId || 'unknown'),
        orderDate: o.OrderDate ? new Date(o.OrderDate) : new Date(),
        currency: o.Currency || 'USD',
        customer: {
            code: o.Customer && o.Customer.Code,
            name: o.Customer && o.Customer.Name,
            email: o.Customer && o.Customer.Email,
            phone: o.Customer && o.Customer.Phone,
            address: o.Customer && o.Customer.Address && {
                line1: o.Customer.Address.Line1,
                line2: o.Customer.Address.Line2,
                city: o.Customer.Address.City,
                state: o.Customer.Address.State,
                postal: o.Customer.Address.Postal,
                country: o.Customer.Address.Country
            }
        },
        items: items.filter(Boolean).map((it) => ({
            sku: String(it.SKU || it.Sku || it.sku || ''),
            name: it.Name || it.Name || it.name,
            qty: coerceNumber(it.Qty || it.qty || it.Quantity),
            price: coerceNumber(it.Price || it.price),
            tax: coerceNumber(it.Tax || it.tax),
            total: coerceNumber(it.Total || it.total)
        })),
        subTotal: coerceNumber(o.SubTotal),
        taxTotal: coerceNumber(o.TaxTotal),
        grandTotal: coerceNumber(o.GrandTotal)
    };
}


module.exports = { buildOrderDTO };