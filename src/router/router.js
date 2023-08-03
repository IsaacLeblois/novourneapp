const express = require('express')
const router = express.Router()
const passport = require('passport')
const log4js = require('log4js')
const logger = log4js.getLogger()
const newsModel = require('../models/news')
const cartModel = require('../models/cart')
const orderModel = require('../models/order')
const userModel = require('../models/user')
const postModel = require('../models/post')
const accountsModel = require('../models/accounts')
const transactionModel = require('../models/transaction')
const productsModel = require('../models/product')
const user = require('../models/user')

//INDEX
router.get('/', (req, res, next) => {
    res.render('index')
})

router.get('/downloads', (req, res, next) => {
    res.render('downloads')
})

router.get('/discord', (req, res, next) => {
    res.render('discord')
})

//FUNCTIONS
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    logger.warn('Usuario anonimo está intentando acceder a una ruta privada')
    res.redirect('/')
}

function isAdmin(req, res, next) {
    if (req.user.isAdmin) {
        return next()
    } else {
        logger.warn('Usuario ' + req.user.name + ' está intentando acceder a una ruta de administrador')
        res.redirect('/')
    }
}

function isPresident(req, res, next) {
    if (req.user.job=="Presidente" || req.user.isAdmin) {
        return next()
    }
    logger.warn('Usuario anonimo está intentando acceder a una ruta presidencial')
    res.redirect('/')
}

function isNewshound(req, res, next) {
    if (req.user.job=="Reportero" || req.user.isAdmin) {
        return next()
    }
    logger.warn('Usuario anonimo está intentando acceder a una ruta de prensa')
    res.redirect('/')
}

//NEWS
router.get('/news', isAuthenticated, async (req, res, next) => {
    const news = await newsModel.find().sort({ createdAt: -1 }).limit(4)
    res.render('news', {
        news: news
    })
})

//SOCIAL
router.get('/social', isAuthenticated, async (req, res, next) => {
    userModel.find().sort({isVerified: -1, name: 1}).exec((err, users) => {
        if (err) {
            res.render('social')
        } else {
            postModel.find().sort({createdAt: -1}).exec((err2, posts) => {
                if(err2) {
                    res.render('social', {
                        users: users
                    })} else {
                    res.render('social', {
                        users: users,
                        posts: posts
                    })
                }
            }) 
        }
    })
})

router.post('/social/post', isAuthenticated, async (req, res, next) => {
    try {
        let thumb
        if (req.body.photo == '') {
            thumb = null
        } else {
            thumb = req.body.photo
        }

        const newPost = {
            author: {
                name: req.user.name,
                lastname: req.user.lastname,
                photo: req.user.photo,
                isVerified: req.user.isVerified
            },
            textbody: req.body.textbody,
            thumbnail: thumb
        }

        try {
            await postModel.create(newPost)
            logger.info('Nuevo post de ' + user.name + ' ' + user.lastname + ' creado exitosamente')
            res.redirect('/social')
        } catch (err) {
            logger.error(err)
        }
    } catch (err) {
        logger.error(err)
    }
})

router.get('/social/:id', isAuthenticated, async (req, res, next) => {
    try {
        const player = await userModel.findOne({ _id: req.params.id }).exec()
        res.render('player', {
            player: player
        })
    } catch (err) {
        res.redirect('/404')
    }
})

router.get('/posts/:id', isAuthenticated, async (req, res, next) => {
    try {
        const post = await postModel.findOne({ _id: req.params.id }).exec()
        const users = await userModel.find().exec()
        res.render('post', {
            post: post
        })
    } catch (err) {
        res.redirect('/404')
    }
})

router.post('/posts/:id', isAuthenticated, async (req, res, next) => {
    try {
        let thumb
        if (req.body.photo == '') {
            thumb = null
        } else {
            thumb = req.body.photo
        }

        const newComment = {
            author: {
                name: req.user.name,
                lastname: req.user.lastname,
                photo: req.user.photo,
                isVerified: req.user.isVerified
            },
            textcomment: req.body.textbody,
            thumbnail: thumb,
        }

        try {
            const post = await postModel.findById(req.params.id)
            const comments = post.comments

            await comments.push(newComment)

            await postModel.findByIdAndUpdate(req.params.id, {comments: comments})

            res.redirect('/posts/'+req.params.id)
        } catch (err) {
            logger.error(err)
        }
    } catch (err) {
        logger.error(err)
    }
})

//BANK
router.get('/bank', isAuthenticated, async (req, res, next) => {
    const userAccount = await accountsModel.findOne({ user: req.user.id }).exec()
    

    function generateCardNumber() {
        let min = 1000000000000000
        let max = 9999999999999999
        const newCardNumber = Math.random()*(max - min)+min

        return newCardNumber.toFixed(0)
    }
    
    function generateCVV() {
        let min = 100
        let max = 999
        const newCVV = Math.random()*(max - min)+min
        
        return newCVV.toFixed(0)
    }
    
    if (!userAccount) {
        const newAccount = new accountsModel()
        newAccount.user = req.user.id,
        newAccount.cardNumber = generateCardNumber(),
        newAccount.CVV = generateCVV()
        
        logger.debug('Cuenta '+newAccount.cardNumber+' creada exitosamente')

        await accountsModel.create(newAccount)
        res.render('bank', {
            account: newAccount,
            transactionsFrom: [],
            transactionsTo: []
        })
    } else {
        const transactionsFrom = await transactionModel.find({ from: userAccount.cardNumber }).sort({ createdAt: -1 })
        const transactionsTo = await transactionModel.find({$and: [{to: userAccount.cardNumber }, {state: "transfered"}]}).sort({ createdAt: -1 })
        res.render('bank', {
            account: userAccount,
            transactionsFrom: transactionsFrom,
            transactionsTo: transactionsTo
        })
    }
})

router.post('/bank/transfer', isAuthenticated, async (req, res, next) => {
    try {
        const account1 = await accountsModel.findOne({ cardNumber: req.body.from }).exec()
        const cardFrom = account1.cardNumber
        const account2 = await accountsModel.findOne({ cardNumber: req.body.to }).exec()

        const wrong = {
            from: cardFrom,
            to: req.body.to,
            quantity: req.body.cant,
            concept: req.body.concept,
            state: "wrong"
        }

        const noFounds = {
            from: cardFrom,
            to: req.body.to,
            quantity: req.body.cant,
            concept: req.body.concept,
            state: "nofounds"
        }

        const rejected = {
            from: cardFrom,
            to: req.body.to,
            quantity: req.body.cant,
            concept: req.body.concept,
            state: "rejected"
        }

        const ok = {
            from: cardFrom,
            to: req.body.to,
            quantity: req.body.cant,
            concept: req.body.concept,
            state: "transfered"
        }

        if(!account2) {
            await transactionModel.create(wrong)
            logger.debug('TRANSACCION WRONG')
            res.redirect('/bank')
        } else {
            if(account1.balance < req.body.cant) {
                await transactionModel.create(noFounds)
                logger.debug('TRANSACCION NOFOUNDS')
                res.redirect('/bank')
            } else {
                if(req.body.from == req.body.to){
                    await transactionModel.create(rejected)
                    logger.debug('TRANSACCION REJECTED')
                    res.redirect('/bank')
                } else {
                    await accountsModel.updateOne({ cardNumber: req.body.from }, {$inc: {"balance": -(req.body.cant)}})
                    await accountsModel.updateOne({ cardNumber: req.body.to }, {$inc: {"balance": (req.body.cant)}})
                    await transactionModel.create(ok)
                    logger.debug('TRANSACCION OK')
                    res.redirect('/bank')
                }
            }
        }

    } catch (err) {
        logger.error(err)
    }
})

router.get('/bank/server', isAuthenticated, isAdmin, async (req, res, next) => {
    const govAccount = await accountsModel.findOne({ user: "Server" }).exec()
    
    const transactionsFrom = await transactionModel.find({ from: govAccount.cardNumber }).sort({ createdAt: -1 })
    const transactionsTo = await transactionModel.find({$and: [{to: govAccount.cardNumber }, {state: "transfered"}]}).sort({ createdAt: -1 })
    res.render('bank2', {
        account: govAccount,
        transactionsFrom: transactionsFrom,
        transactionsTo: transactionsTo
    })
})

router.get('/bank/government', isAuthenticated, isPresident, async (req, res, next) => {
    const govAccount = await accountsModel.findOne({ user: "Novourne" }).exec()
    
    const transactionsFrom = await transactionModel.find({ from: govAccount.cardNumber }).sort({ createdAt: -1 })
    const transactionsTo = await transactionModel.find({$and: [{to: govAccount.cardNumber }, {state: "transfered"}]}).sort({ createdAt: -1 })
    res.render('bank2', {
        account: govAccount,
        transactionsFrom: transactionsFrom,
        transactionsTo: transactionsTo
    })
})

router.get('/bank/master', isAuthenticated, isPresident, async (req, res, next) => {
    const masterAccount = await accountsModel.findOne({ user: "Banco" }).exec()
    
    const transactionsFrom = await transactionModel.find({ from: masterAccount.cardNumber }).sort({ createdAt: -1 })
    const transactionsTo = await transactionModel.find({$and: [{to: masterAccount.cardNumber }, {state: "transfered"}]}).sort({ createdAt: -1 })
    res.render('bank2', {
        account: masterAccount,
        transactionsFrom: transactionsFrom,
        transactionsTo: transactionsTo
    })
})

//MARKET
router.get('/market', isAuthenticated, async (req, res, next) => {
    res.render("market")
})

router.get('/market/discounts', isAuthenticated, async (req, res, next) => {
    productsModel.find({isDiscounted: true}).sort({price: -1}).exec((err, products) => {
        if (err) {
            res.send('ERROR AL CARGAR LOS PRODUCTOS')
        } else {
            res.render('discounts', {
                products: products,
            })
        }
    })
})

router.get('/market/mypurchases', isAuthenticated, async (req, res, next) => {
    res.render("myPurchases")
})

router.get('/market/sales', isAuthenticated, async (req, res, next) => {
    res.render("sales")
})

//AUTH
router.get('/signup', (req, res, next) => {
    res.render('signup')
})

router.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/signup',
    passReqToCallback: true
}))

router.get('/signin', (req, res, next) => {
    res.render('signin')
})

router.post('/signin', passport.authenticate('local-signin', {
    successRedirect: '/',
    failureRedirect: '/signin',
    passReqToCallback: true
}))

router.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) { return next(err) }
        res.redirect('/signin')
    })
})

//USER
router.get('/profile', isAuthenticated, (req, res, next) => {
    res.render('profile')
})

router.post('/profile/update', isAuthenticated, async (req, res, next) => {
    try {
        const oldProfile = await userModel.findOne({ email: req.user.email }).exec()

        let thumb
        if (req.body.photo == '') {
            thumb = null
        } else {
            thumb = req.body.photo
        }

        const newProfile = {
            email: req.body.email,
            name: req.body.name,
            lastname: req.body.lastname,
            usernmae: req.body.username,
            age: req.body.age,
            photo: thumb
        }

        try {
            await userModel.findOneAndUpdate({ email: oldProfile.email }, { email: newProfile.email, name: newProfile.name, lastname: newProfile.lastname, username: newProfile.username, age: newProfile.age, photo: newProfile.photo }, { upsert: true }).exec()
            logger.info('Perfil de ' + oldProfile.name + ' ' + oldProfile.lastname + ' actualizado exitosamente')
            res.redirect('/profile')
        } catch (err) {
            logger.error(err)
        }
    } catch (err) {
        logger.error(err)
    }
})

router.post('/profile/password/update', isAuthenticated, (req, res, next) => {
    res.redirect('/501')
})

router.get('/cart', isAuthenticated, async (req, res, next) => {
    const userCart = await cartModel.findOne({ user: req.user.name }).exec()

    if (!userCart) {
        const newCart = {
            user: req.user.name,
            products: []
        }
        await cartModel.create(newCart)
        res.render('cart', {
            cart: newCart,
            data: newCart.products
        })
    } else {
        productData = []

        for (i = 0; i < userCart.products.length; i++) {
            const e = await productsModel.findById(userCart.products[i])
            productData.push(e)
        }

        res.render('cart', {
            cart: userCart,
            data: productData
        })
    }

})

router.post('/cart', async (req, res, next) => {
    const userCart = await cartModel.findOne({ user: req.user.name }).exec()
    const productsIds = userCart.products

    productData = []
    totalAmount = 0

    for (i = 0; i < userCart.products.length; i++) {
        const e = await productsModel.findById(userCart.products[i])
        const precio = parseInt(e.price)
        totalAmount = totalAmount + precio
        productData.push(e)
    }

    const newOrder = {
        user: req.user.name,
        products: productsIds,
        amount: totalAmount,
        adress: req.user.adress,
        status: 'pending'
    }

    await orderModel.create(newOrder)
    await cartModel.deleteOne({ user: req.user.name })

    res.render('thanks')
})

router.get('/job', isAuthenticated, (req, res, next) => {
    res.render('job')
})

//ADMIN
router.get('/admin', isAuthenticated, isAdmin, (req, res, next) => {
    newsModel.find().exec((err, news) => {
        if (err) {
            res.send('ERROR AL CARGAR LOS PRODUCTOS')
        } else {
            res.render('admin', {
                news: news,
            })
        }
    })
})

router.get('/admin/market', isAuthenticated, isAdmin, (req, res, next) => {
    productsModel.find().sort({title: 1}).exec((err, products) => {
        if (err) {
            res.send('ERROR AL CARGAR LOS PRODUCTOS')
        } else {
            res.render('admin-market', {
                products: products,
            })
        }
    })
})

router.post('/admin/market', isAuthenticated, isAdmin, async (req, res, next) => {
    try {
        const newProduct = {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            deliveryPrice: 0,
            thumbnail: req.body.thumbnail,
            seller: "Novourne"
        }

        await productsModel.create(newProduct)
        logger.info('Producto '+newProduct.title+' creado exitosamente.')
        res.redirect('/admin/market')
    } catch (err) {
        logger.error(err)
    }
})

router.get('/admin/market/:id', isAuthenticated, isAdmin, async (req, res, next) => {
    try {
        const product = await productsModel.findById(req.params.id)
        res.render('admin-product', {
            product: product
        })
    } catch (err) {
        logger.error(err)
    }
})

router.post('/admin/market/:id', isAuthenticated, isAdmin, async (req, res, next) => {
    try {
        let b = false
        if(req.body.isDiscounted=="on") {
            b = true
        }
        console.log(b)
        const newProduct = {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            deliveryPrice: req.body.deliveryPrice,
            thumbnail: req.body.thumbnail,
            categories: req.body.categories,
            seller: req.body.seller,
            isDiscounted: b
        }

        await productsModel.findOneAndUpdate({ _id: req.params.id }, {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            deliveryPrice: req.body.deliveryPrice,
            thumbnail: req.body.thumbnail,
            categories: req.body.categories,
            seller: req.body.seller,
            isDiscounted: b
        }, { upsert: true }).exec()
        logger.info('Producto '+newProduct.title+' editado exitosamente.')
        res.redirect('/admin/market/'+req.params.id)
    } catch (err) {
        logger.error(err)
    }
})

router.get('/admin/create', isAuthenticated, isNewshound, (req, res, next) => {
    res.render('create')
})

router.post('/admin/create', isAuthenticated, isNewshound, async (req, res, next) => {
    if (!req.body.title || !req.body.author || !req.body.textbody || !req.body.thumbnail) {
        res.send('Debes ingresar todos los campos.')
    } else {
        const newNotice = req.body
        newsModel.create(newNotice)
        res.redirect('/news')
    }
})

router.get('/admin/stats', isAuthenticated, isAdmin, async (req, res, next) => {
    res.render('stats')
})

router.get('/501', (req, res, next) => {
    res.render('501')
})

router.get('/404', (req, res, next) => {
    res.render('404')
})

router.get('/:ruta', (req, res, next) => {
    res.render('404')
})

//NEWS
router.get('/news/:id', isAuthenticated, async (req, res, next) => {
    try {
        const notice = await newsModel.findById(req.params.id).exec()
        res.render('notice', {
            notice: notice
        })
    } catch (err) {
        res.redirect('/404')
    }
})

router.get('/news/:id/delete', async (req, res, next) => {
    try {
        const prevCart = await cartModel.findOne({ user: req.user.name }).exec()
        const newCart = [...prevCart.products]
        const index = newCart.indexOf(req.params.id)
        newCart.splice(index)
        await cartModel.updateOne({ user: req.user.name }, { $set: { "products": newCart } }).exec()
    } catch (err) {
        console.log(err)
    }
    res.redirect('/cart')
})

router.post('/news/:id', isAuthenticated, async (req, res, next) => {
    console.log('INICIA POST A ID ' + req.params.id)
    try {
        const product = await productsModel.findById(req.params.id)
        const prevCart = await cartModel.findOne({ user: req.user.name }).exec()
        const newCart = [...prevCart.products]
        newCart.push(product)
        await cartModel.updateOne({ user: req.user.name }, { $set: { "products": newCart } }).exec()
        res.redirect('cart')
    } catch (err) {

    }
})

//GOVERNMENT

module.exports = router