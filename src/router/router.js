const express = require('express')
const router = express.Router()
const passport = require('passport')
const log4js = require('log4js')
const logger = log4js.getLogger()
const client = require('../../twilio'); 
const productsModel = require('../models/product')
const cartModel = require('../models/cart')
const orderModel = require('../models/order')

//HOME
router.get('/', (req, res, next) => {
    res.redirect('/home')
})

router.get('/home', (req, res, next) => {
    productsModel.find().exec((err, products) => {
        if(err) {
            res.send('ERROR AL CARGAR LOS PRODUCTOS')
        } else {
            res.render('home', {
                products: products,
            })
        }
    })
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
    client.messages.create({
        body: 'Nueva orden creada: '+userCart.id+'\nNombre: '+req.user.name+'\nFecha: '+userCart.createdAt+'\nProductos: '+productsIds+'\nTotal: '+totalAmount+'\nDireccion: '+req.user.adress, 
        from: 'whatsapp:+14155238886',       
        to: 'whatsapp:+5215547408974' 
    })
    res.render('thanks')
})

//ADMIN
router.get('/admin', isAuthenticated, isAdmin, (req, res, next) => {
    productsModel.find().exec((err, products) => {
        if(err) {
            res.send('ERROR AL CARGAR LOS PRODUCTOS')
        } else {
            res.render('admin', {
                products: products,
            })
        }
    })
})

router.get('/admin/create', isAuthenticated, isAdmin, (req, res, next) => {
    res.render('create')
})

router.post('/admin/create', isAuthenticated, isAdmin, async (req, res, next) => {
    if(!req.body.title || !req.body.price || !req.body.thumbnail) {
        res.send('Debes ingresar todos los campos.')
    } else {
        const newProd = req.body
        productsModel.create(newProd)
        res.send('Producto agregado exitosamente')
    }
})

//PRODUCT
router.get('/:id', async (req, res, next) => {
    try {
        const producto = await productsModel.findById(req.params.id)
        res.render('product', {producto})
    } catch(err) {
        res.render('404')
    }
})

router.get('/:id/delete', async (req, res, next) => {
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

router.post('/:id', isAuthenticated, async (req, res, next) => {
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