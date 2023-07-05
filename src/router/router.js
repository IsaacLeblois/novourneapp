const express = require('express')
const router = express.Router()
const passport = require('passport')
const log4js = require('log4js')
const logger = log4js.getLogger()
const newsModel = require('../models/news')
const cartModel = require('../models/cart')
const orderModel = require('../models/order')
const userModel = require('../models/user')
const user = require('../models/user')

//HOME
router.get('/', (req, res, next) => {
    res.redirect('/home')
})

router.get('/home', (req, res, next) => {
    newsModel.find().exec((err, news) => {
        if(err) {
            res.send('ERROR AL CARGAR LOS PRODUCTOS')
        } else {
            res.render('home', {
                news: news,
            })
        }
    })
})

router.get('/discord', (req, res, next) => {
    res.render('discord')
})

//AUTH
router.get('/signup', (req, res, next) => {
    res.render('signup')
})

router.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/home',
    failureRedirect: '/signup',
    passReqToCallback: true
}))

router.get('/signin', (req, res, next) => {
    res.render('signin')
})

router.post('/signin', passport.authenticate('local-signin', {
    successRedirect: '/home',
    failureRedirect: '/signin',
    passReqToCallback: true
}))

router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if(err) { return next(err) }
        res.redirect('/signin')
    })
})

function isAuthenticated(req, res, next) {
    if(req.isAuthenticated()) {
        return next()
    }
    logger.warn('Usuario anonimo está intentando acceder a una ruta privada')
    res.redirect('/home')
}

function isAdmin(req, res, next) {
    if(req.user.isAdmin) {
        return next()
    } else {
        logger.warn('Usuario '+req.user.name+' está intentando acceder a una ruta de administrador')
        res.redirect('/home')
    }
}

//USER
router.get('/profile', isAuthenticated, (req, res, next) => {
    res.render('profile')
})

router.post('/profile/update', isAuthenticated, async (req, res, next) => {
    try {
        const oldProfile = await userModel.findOne({ email: req.user.email }).exec()

        let thumb
        if(req.body.photo == '') {
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
            await userModel.findOneAndUpdate({ email: oldProfile.email }, { email: newProfile.email, name: newProfile.name, lastname: newProfile.lastname, username: newProfile.username, age: newProfile.age, photo: newProfile.photo }, {upsert: true}).exec()
            logger.info('Perfil de '+ oldProfile.name + ' ' + oldProfile.lastname + ' actualizado exitosamente')
            res.redirect('/profile')
        } catch(err) {
            logger.error(err)
        }
    } catch(err) {
        logger.error(err)
    }
})

router.post('/profile/password/update', isAuthenticated, (req, res, next) => {
    res.redirect('/501')
})

router.get('/profile/:id', async (req, res, next) => {
    try {
        const player = await userModel.findById(req.params.id).exec()
        res.render('player', {player})
    } catch(err) {
        res.redirect('/404')
    }
})

router.get('/cart', isAuthenticated, async (req, res, next) => {
    const userCart = await cartModel.findOne({ user: req.user.name }).exec()
    
    if(!userCart) {
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
        
        for(i=0; i<userCart.products.length; i++) {
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

    for(i=0; i<userCart.products.length; i++) {
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
        if(err) {
            res.send('ERROR AL CARGAR LOS PRODUCTOS')
        } else {
            res.render('admin', {
                news: news,
            })
        }
    })
})

router.get('/admin/create', isAuthenticated, isAdmin, (req, res, next) => {
    res.render('create')
})

router.post('/admin/create', isAuthenticated, isAdmin, async (req, res, next) => {
    if(!req.body.title || !req.body.author || !req.body.textbody || !req.body.thumbnail) {
        res.send('Debes ingresar todos los campos.')
    } else {
        const newNotice = req.body
        newsModel.create(newNotice)
        res.send('Noticia agregada exitosamente')
    }
})

router.get('/501', (req, res, next) => {
    res.render('501')
})

router.get('/404', (req, res, next) => {
    res.render('404')
})

//NEWS
router.get('/news/:id', async (req, res, next) => {
    try {
        const notice = await newsModel.findById(req.params.id).exec()
        res.render('notice', {notice})
    } catch(err) {
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
    } catch(err) {
        console.log(err)
    }
    res.redirect('/cart')
})

router.post('/news/:id', isAuthenticated, async (req, res, next) => {
    console.log('INICIA POST A ID '+req.params.id)
    try {
        const product = await productsModel.findById(req.params.id)
        const prevCart = await cartModel.findOne({ user: req.user.name }).exec()
        const newCart = [...prevCart.products]
        newCart.push(product)
        await cartModel.updateOne({ user: req.user.name }, { $set: { "products": newCart } }).exec()
        res.redirect('cart')
    } catch(err) {
        
    }
})

module.exports = router