const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

require('mongoose-type-email');

const customerSchema = new Schema({
  email: {
    type: mongoose.SchemaTypes.Email,
    unique: true,
    required: true
  },
  name: {
    type: String,
    default: ''
  },
  mobileNumber: {
    type: String,
    default: ''
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  // profileImg: {
  //   type: String,
  //   default: ''
  // },
  country: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  dob: {
    type: Date
  },
  anniversary: {
    type: Date
  },
  occupation: {
    type: String,
    default: ''
  },
  brandAbout: {
    type: String,
    default: ''
  },
  userId: {
    type: Schema.Types.ObjectId, //Id who add the customer
    ref: 'users'
  },
  customerStatus: {
    type: Number, // 1 - active  2 - inactive 3 - delete
    enum: [1, 2, 3],
    default: 1
  }

}, {
    timestamps: true
  });


const customer = mongoose.model('customers', customerSchema);

module.exports = customer;