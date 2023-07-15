const mongoose = require('mongoose')
const { Schema } = mongoose

const productSchema = new Schema({
    title: { type: String, required: true, unique: true },
    description: { type: String },
    price: { type: Number, required: true },
    deliveryPrice: { type: Number, required: true },
    stock: { type: Number, required: true, default: 1 },
    seller: { type: String, required: true, default: "Novourne" },
    thumbnail: { type: String },
    categories: { type: Array },
    isDiscounted: { type: Boolean, default: false }
}, {timestamps: true})

module.exports = mongoose.model('product', productSchema)