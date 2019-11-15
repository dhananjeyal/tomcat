let express = require('express'),
    invoiceRouter = new express.Router(),
    invoiceController = require('../controllers/invoiceController'),
    passport = require('passport'),
    __ = require('../../helpers/globalFunctions'),
    jwt = require('jsonwebtoken'),
    middleware = require('../middleware');

/**
 * AUTHENTICATION
 *
 **/



invoiceRouter.use(passport.authenticate('jwt', {
    session: false
}), function (req, res, next) {
    if (req.user)
        next();
    else {
        return res.status(401).json({
            "status": 0,
            message: res
        });
    }

});

// to get the products according to the manager
invoiceRouter.get('/productlist', middleware.validate, invoiceController.productlist);

//To list the serialNo in invoice
invoiceRouter.get('/listserialno', middleware.validate, invoiceController.listserialno);


//To get all cusomter in invoice with search
invoiceRouter.get('/customerlist', middleware.validate, invoiceController.customerlist);


//To add invoice
invoiceRouter.post('/addinvoice', middleware.validate, invoiceController.addinvoice);

//To get the invoice with search
invoiceRouter.get('/getinvoice', middleware.validate, invoiceController.getinvoice);

//view invoice
invoiceRouter.get('/perinvoice/:invoiceId', middleware.validate, invoiceController.perinvoice);

// Delete invoice
invoiceRouter.delete('/deleteinvoice/:invoiceId', middleware.validate, invoiceController.deleteinvoice);


// global search
invoiceRouter.get('/globalsearch', middleware.validate, invoiceController.globalsearch);

module.exports = invoiceRouter;