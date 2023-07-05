const mongoose = require('mongoose')
const { Schema } = mongoose

const newsSchema = new Schema({
    title: { type: String, required: true, unique: true },
    author: { type: String, required: true },
    textbody: { type: String, required: true },
    categories: { type: Array },
    thumbnail: { type: String, required: true }
}, {timestamps: true})

module.exports = mongoose.model('news', newsSchema)