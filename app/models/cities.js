const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const citySchema = new Schema({
  id: {
    type: String
  },
  name: {
    type: String
  },
  state_id: {
    type: String
  }
}, {
    timestamps: true
  });


const city = mongoose.model('cities', citySchema);

module.exports = city;