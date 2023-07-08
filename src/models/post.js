const mongoose = require('mongoose')
const { Schema } = mongoose

const postSchema = new Schema({
    author:{
        name: {
            type: String,
            required: true
        },
        lastname: {
            type: String,
            required: true
        },
        photo: {
            type: String,
        },
        isVerified: {
            type: Boolean,
        },
    },
    textbody: { type: String, required: true },
    comments: { type: Array },
    categories: { type: Array },
    thumbnail: { type: String, default: null }
}, {timestamps: true})

module.exports = mongoose.model('posts', postSchema)