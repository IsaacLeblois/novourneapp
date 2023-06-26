const mongoose = require('mongoose')
const { Schema } = mongoose

const orderSchema = new Schema({
    user: { type: String, required: true },
    products: [
        {
            productId: {
                type: String
            },
            Quantity: {
                type: Number,
                default: 1
            }
        }
    ],
    amount: { type: Number, required: true },
    adress: { type: Object, required: true },
    status: { type: String, default: 'pending' }
}, {timestamps: true})

module.exports = mongoose.model('orders', orderSchema)