const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const storeSchema = new Schema({

  name: {
    type: String,
  },
  number: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  location: {
    type: String,
    default: ''
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users'
  },
  storeStatus: {
    type: Number, // 1 - active 2 - inactive 3 - delete
    enum: [1, 2, 3],
    default: 1
  }

}, {
    timestamps: true
  });


const store = mongoose.model('stores', storeSchema);

module.exports = store;