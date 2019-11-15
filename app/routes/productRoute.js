let express = require('express'),
    productRouter = new express.Router(),
    productController = require('../controllers/productController.js'),
    passport = require('passport'),
    __ = require('../../helpers/globalFunctions'),
    jwt = require('jsonwebtoken'),
    multer = require('multer'),
    middleware = require('../middleware');

const storage = multer.diskStorage({
    destination: './public/product_img',
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });


/**
 * AUTHENTICATION
 *
 **/

productRouter.use(passport.authenticate('jwt', {
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

//create new product
productRouter.post('/addproduct', middleware.validate, upload.single('file'), productController.addproduct);

//To display by category
productRouter.get('/getallproduct', middleware.validate, productController.getall);

//view the category by name and location
productRouter.get('/getcategory', middleware.validate, productController.getcategory);

//view the product list
productRouter.get('/productlist', middleware.validate, productController.productlist);

//change current location and status of the product
productRouter.put('/updatelocation', middleware.adminvalid, productController.updatelocation);

//edit product
productRouter.get('/editproduct/:productId', middleware.validate, productController.editproduct);

//update product details
productRouter.patch('/updateproduct/:productId', middleware.validate, upload.single('file'), productController.updateproduct);

//delete store manager
productRouter.delete('/deleteproduct/:productId', middleware.validate, productController.deleteproduct);

//product bulk upload using excel file
productRouter.post('/exltojson', middleware.adminvalid, upload.single('file'), productController.exceltojson);

// sameple excel download
productRouter.get('/proudctexcel', middleware.adminvalid, productController.exceldownload);

//change current location and status of the product
productRouter.get('/listproduct', middleware.adminvalid, productController.listproduct);

// product view
productRouter.get('/viewproduct/:productId', middleware.adminvalid, productController.viewproduct);

module.exports = productRouter;