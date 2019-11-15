const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const stateSchema = new Schema({
  id:{
    type:String
  },
  name: {
    type: String
  },
  country_id: {
    type: String
  }

}, {
    timestamps: true
  });


const state = mongoose.model('states', stateSchema);

module.exports = state;