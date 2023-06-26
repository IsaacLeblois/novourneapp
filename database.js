const mongoose = require('mongoose')
const { mongodb } = require('./keys')
const log4js = require('log4js')
const logger = log4js.getLogger()

mongoose.connect(mongodb.URI, {})
    .then(db => logger.info('Base de datos conectada'))
    .catch(err => logger.error(err))