const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const User = require('../models/user')
const log4js = require('log4js')
const logger = log4js.getLogger()
const jwt = require('jsonwebtoken')

passport.serializeUser((user, done) => {
    done(null, user.id)
    logger.debug('Usuario '+user.name+' '+user.lastname+' serializado')
})

passport.deserializeUser( async (id, done) => {
    const user = await User.findById(id)
    done(null, user)
    logger.debug('Usuario '+user.name+' '+user.lastname+' deserializado')
})

passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    nameField: 'name',
    lastnameField: 'lastname',
    ageField: 'age',
    genderField: 'gender',
    creatorField: 'creator',
    passReqToCallback: true,

}, async function (req, email, password, done) {

    const user = await User.findOne({email: email})
    
    if(user) {
        logger.warn('El correo ya fue registrado')
        return done(null, false, req.flash('signupMessage', 'El correo ya fue registrado.'))
    } else {
        const newUser = new User()
        newUser.email = email
        newUser.password = newUser.encryptPassword(password)
        newUser.name = req.body.name
        newUser.lastname = req.body.lastname
        newUser.username = req.body.username
        newUser.age = req.body.age
        newUser.gender = req.body.gender
        newUser.creator = req.body.creator
        newUser.role = null
        newUser.job = null
        newUser.photo = null

        logger.info('Usuario '+newUser.name+' '+newUser.lastname+' se ha registrado correctamente')
        await newUser.save()
        done(null, newUser)
    }

}))

passport.use('local-signin', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
}, async (req, email, password, done) => {
    
    const user = await User.findOne({email: email})
    
    if(!user) {
        logger.warn('Usuario '+email+' no existe')
        return done(null, false, req.flash('signinMessage', 'No se encontró el usuario.'))
    } if(!user.matchPassword(password)) {
        logger.warn('Usuario '+email+' está intentando acceder con una contraseña incorrecta')
        return done(null, false, req.flash('signinMessage' ,'Contraseña incorrecta.'))
    }
    
    done(null, user)
    
    const accessToken = jwt.sign({
        id:user.id,
        isAdmin: user.isAdmin
    }, 'secretoDeIsaac', {expiresIn:'10m'})

    if(req.user.isAdmin) {
        logger.info('Administrador '+user.name+' '+user.lastname+' ha inciado sesion')
    } else {
        logger.info('Usuario '+user.name+' '+user.lastname+' ha inciado sesion')
    }

}))