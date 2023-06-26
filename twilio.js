const { twilio } = require('./keys')
const client = require('twilio')(twilio.accountSid, twilio.authToken)
module.exports = client