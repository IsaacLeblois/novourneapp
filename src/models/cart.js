const mongoose = require('mongoose')
const { Schema } = mongoose

const cartSchema = new Schema({
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
    ]
}, {timestamps: true})

module.exports = mongoose.model('carts', cartSchema)