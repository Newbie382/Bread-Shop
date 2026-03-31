const mongoose = require('mongoose')

const PromotionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { 
        type: String, 
        required: true, 
        enum: ['percent', 'fixed', 'minspend'] 
    },
    value: { type: Number, required: true, min: 0 },
    minAmount: { type: Number, default: 0 },   // ใช้เฉพาะ type: 'minspend'
    isActive: { type: Boolean, default: true } // เปิด/ปิด promotion ได้
}, { timestamps: true })

module.exports = mongoose.model('Promotion', PromotionSchema)

module.exports.savePromotion = function(model, data) {
    model.save(data)
}