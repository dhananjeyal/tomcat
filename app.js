const os = require("os"),
  dotenv = require('dotenv').config(),
  mongoose = require('mongoose'),
  express = require('express'),
  app = express(),
  chalk = require('chalk'),
  bodyParser = require('body-parser'),
  passport = require('passport'),
  cors = require('cors'),
  morgan = require('morgan');

/**
 *  Connection Setup
 */
const db_host = process.env.DB_HOST,
  environment = process.env.MODE,
  port = process.env.PORT;

/**
* Connect to MongoDB.
*/
mongoose.Promise = global.Promise;
mongoose.connect(db_host, { useNewUrlParser: true, useCreateIndex: true });
mongoose.set('useFindAndModify', false);
mongoose.connection.on('error', (err) => {
  console.log("error in mongobd--->", err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/*Express configuration*/
app.set('port', port);
app.use(morgan('dev'));
app.use(cors());


app.use(bodyParser.json({
  limit: '50mb'
}));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb',
  parameterLimit: 1000000
}));

app.use(passport.initialize());
app.use(express.static('public'));

//Models
const User = require('./app/models/users');


//defining router
const userRoute = require('./app/routes/userRoute'),
  productRoute = require('./app/routes/productRoute'),
  customerRoute = require('./app/routes/customerRoute'),
  managerRoute = require('./app/routes/managerRoute'),
  invoiceRoute = require('./app/routes/invoiceRoute');
require('./helpers/authApi');

/* User Routes */
app.use('/user', userRoute);
app.use('/product', productRoute);
app.use('/customer', customerRoute);
app.use('/manager', managerRoute);
app.use('/invoice', invoiceRoute);

const __ = require('./helpers/globalFunctions');

function saveAdmin() {
  User.findOne({ userName: "admin@ivarjewelry.com" }).exec(function (err, value) {
    if (!value) {
      var newuser = new User();
      newuser.userName = "admin@ivarjewelry.com";
      newuser.password = newuser.generateHash("Ivara@admin");
      newuser.role = "admin";
      newuser.accountStatus = 1;
      newuser.save();
    }
  });
};


/* Start Express server. */
app.listen(app.get('port'), (req, res) => {
  saveAdmin();
  console.log(`%s App is running at ${process.env.LIVE_BASEURL} `, chalk.green('✓'), app.get('port'), environment);
  console.log('Press CTRL-C to exit');
});
