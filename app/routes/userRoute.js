let express = require('express'),
    userRouter = new express.Router(),
    userController = require('../controllers/userController.js'),
    passport = require('passport'),
    __ = require('../../helpers/globalFunctions'),
    jwt = require('jsonwebtoken'),
    multer = require('multer'),
    middleware = require('../middleware/index');
//  validation = require('../middleware/validation');

const storage = multer.diskStorage({
    destination: './public/manager_img',
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// WITHOUT AUTHENTICATION ROUTES

//admin login
userRouter.post('/login', userController.login);


/**
 * AUTHENTICATION
 *
 **/

userRouter.use(passport.authenticate('jwt', {
    session: false
}), function (req, res, next) {
    if (req.user)
        next();
    else
        return res.status(401).json({
            "status": 0,
            message: res
        });
});

//create new store
userRouter.post('/addstore', middleware.adminvalid, upload.single('file'), userController.createstore);

//To display all store manager
userRouter.get('/getallstore', middleware.adminvalid, userController.getall);

//edit store
userRouter.get('/editstore/:storeId', middleware.adminvalid, userController.editstore);

//update store and manager details
userRouter.patch('/updatestore/:storeId', middleware.adminvalid, upload.single('file'), userController.updatestore);

//delete store and manager
userRouter.delete('/deletestore/:storeId', middleware.adminvalid, userController.deletestore);

//count in  dashboard
userRouter.get('/dashboard', middleware.adminvalid, userController.dashboard);

userRouter.post('/logout', middleware.adminvalid, userController.logout);


userRouter.post('/changepassword', middleware.adminvalid, userController.changepassword);
module.exports = userRouter;