const mongoose = require('mongoose')
const { Schema } = mongoose

const transactionSchema = new Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    concept: { type: String },
    state: { type: String, default: 'pending' }
}, {timestamps: true})

module.exports = mongoose.model('transactions', transactionSchema)