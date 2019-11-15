let express = require("express"),
  managerRouter = new express.Router(),
  managerController = require("../controllers/managerController"),
  passport = require("passport"),
  __ = require("../../helpers/globalFunctions"),
  jwt = require("jsonwebtoken"),
  middleware = require('../middleware');

// WITHOUT AUTHENTICATION ROUTES

//store manager login
managerRouter.post("/login", (req, res) => {
  managerController.login(req, res);
});

/**
 * AUTHENTICATION
 *
 **/

managerRouter.use(
  passport.authenticate("jwt", {
    session: false
  }),
  function (req, res, next) {
    if (req.user) next();
    else
      return res.status(401).json({
        status: 0,
        message: res
      });
  }
);

//To get store for dropdown
managerRouter.get("/getstore", middleware.validate, managerController.getstore);

//To get the product stock
managerRouter.get("/productstock", middleware.validate, managerController.productstock);

// Edit stock
managerRouter.get("/editstock/:storeId", middleware.validate, managerController.editstock);

// update stock
managerRouter.put("/updatestock", middleware.validate, managerController.updatestock);

// To get the sale of the particular product
managerRouter.get("/sale", middleware.adminvalid, managerController.sale);

// bar chart
managerRouter.get("/barchart", middleware.adminvalid, managerController.barchart);

// pie chart
managerRouter.get("/piechart", middleware.adminvalid, managerController.piechart);


module.exports = managerRouter;
