const mongoose = require('mongoose')
const { Schema } = mongoose

const productSchema = new Schema({
    title: { type: String, required: true, unique: true },
    price: { type: String, required: true, unique: true },
    categories: { type: Array },
    thumbnail: { type: String, required: true }
}, {timestamps: true})

module.exports = mongoose.model('products', productSchema)