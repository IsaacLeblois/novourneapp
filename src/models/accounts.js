const mongoose = require('mongoose')
const { Schema } = mongoose

const accountsSchema = new Schema({
    user: { type: String, required: true },
    cardNumber: { type: String, required: true },
    CVV: { type: String, required: true },
    balance: { type: Number, default: 0 },
}, {timestamps: true})

module.exports = mongoose.model('accounts', accountsSchema)