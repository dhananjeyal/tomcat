const passport = require('passport'),
    JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt,
    dotenv = require('dotenv').config(),
    User = require('../app/models/users'),
    __ = require('./globalFunctions');

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.API_KEY
};

passport.use(new JwtStrategy(opts, (jwtPayload, done) => {
   
    User.findOne({
        _id: jwtPayload.id,
        lastlogin: jwtPayload.lastlogin
    })
        .then(user => {

            if (!user) {
                return done(null, false);
                // return done(null, false, { message: 'session over' });
            }
            else {
                user = user.toObject();
                return done(null, user);
            }
        })
        .catch(err => {
            return done(err, false);
        });

}));