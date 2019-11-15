let express = require('express'),
    customerRouter = new express.Router(),
    customerController = require('../controllers/customerController.js'),
    passport = require('passport'),
    __ = require('../../helpers/globalFunctions'),
    jwt = require('jsonwebtoken'),
    middleware = require('../middleware');



/**
 * AUTHENTICATION
 *
 **/

customerRouter.use(passport.authenticate('jwt', {
    session: false
}),
    function (req, res, next) {
        if (req.user)
            next();
        else
            return res.status(401).json({
                "status": 0,
                message: res
            });
    });

//create new customer
customerRouter.post('/addcustomer', middleware.validate, customerController.addcustomer);

//To display all customer
customerRouter.get('/getallcustomer', middleware.validate, customerController.getall);

//edit customer
customerRouter.get('/editcustomer/:customId', middleware.validate, customerController.editcustomer);

//update customer details
customerRouter.patch('/updatecustomer/:customId', middleware.validate, customerController.updatecustomer);

//delete store manager
customerRouter.delete('/deletecustomer/:customId', middleware.validate, customerController.deletecustomer);


// get country 
customerRouter.get('/country', middleware.validate, customerController.country);

// Get state 
customerRouter.get('/state/:stateid', middleware.validate, customerController.state);
//Get city
customerRouter.get('/city/:cityid', middleware.validate, customerController.city);


module.exports = customerRouter;