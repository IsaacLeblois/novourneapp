//PACKAGES
const express = require('express')
const morgan = require('morgan')
const passport = require('passport')
const session = require('express-session')
const flash = require('connect-flash')
const log4js = require('log4js')
const engine = require('ejs-mate')
const bodyParser = require('body-parser')
const { Server: HttpServer } = require('http')
const { Server: IOServer } = require('socket.io')

//INITIALIZATIONS
const app = express()
const httpServer = new HttpServer(app)
const io = new IOServer(httpServer)
require('./database')
require('./src/passport/local-auth')

log4js.configure({
    appenders: {
        miLoggerConsole: { type: 'console' }
    },
    categories: {
        default: { appenders: ['miLoggerConsole'], level: 'trace' }
    }
})
const logger = log4js.getLogger()
logger.trace('Logger iniciado correctamente')

//MIDDLEWARES
app.set('views', 'src/views')
app.engine('ejs', engine)
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.json())
app.use(morgan('dev'))
app.use(session({
    secret: 'mysecretsession',
    resave: false,
    saveUninitialized: false
}))
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
    app.locals.signupMessage = req.flash('signupMessage')
    app.locals.signinMessage = req.flash('signinMessage')
    app.locals.user = req.user
    next()
})

//ROUTES
app.use('/', require('./src/router/router'))

const PORT = process.env.PORT || 8080

// const server = app.listen(PORT, () => {
//     logger.info('Servidor iniciado en el puerto '+PORT)
// })

httpServer.listen(PORT, () => logger.info(`Servidor iniciado en el puerto ${PORT}`));

// server.on('error', error => logger.fatal('Error al iniciar el servidor '+error))

//SOCKETS
io.on('connection', (socket) => {
    socket.emit('socketConnected', 'success')

    socket.on('productListRequest', async () => {
        const allProducts = await productsController.getAllProduct()
        socket.emit('updateProductList', allProducts)
    })

    socket.on('chatMessagesRequest', async () => {
        const allMessages = await messagesController.getAllMessages()
        socket.emit('updateChat', allMessages)
    })

    socket.on('addNewProduct', async (newProduct) => {
        await productsController.addNewProduct(newProduct)
        const allProducts = await productsController.getAllProduct()
        socket.emit('updateProductList', allProducts)
    })

    socket.on('addNewMessage', async (newMessage) => {
        await messagesController.addNewMessage(newMessage)
        const allMessages = await messagesController.getAllMessages()
        socket.emit('updateChat', allMessages)
    })
})