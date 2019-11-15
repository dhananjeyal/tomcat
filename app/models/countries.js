const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const countrySchema = new Schema({

  id: {
    type: Number
  },
  sortname: {
    type: String
  },
  name: {
    type: String
  },
  phoneCode: {
    type: String
  }

}, {
    timestamps: true
  });


const country = mongoose.model('countries', countrySchema);

module.exports = country;