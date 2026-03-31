const mongoose = require("mongoose")

const SaleSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member',  required: true },
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    promotion: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion', default: null },
    paymentMethod: { type: String, enum: ['cash', 'qr'], default: 'cash' },
    date: { type: Date, default: Date.now }
}, { timestamps: true })

// สร้างและส่งออก Model
module.exports = mongoose.model("Sale", SaleSchema)

module.exports.saveSale = function(model, data){
    model.save(data)
}