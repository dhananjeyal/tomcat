const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const stockSchema = new Schema({

  productId: {
    type: Schema.Types.ObjectId,
    ref: 'products',
  },
  productName:{
    type:String,
    default:""
  },
  location:{
    type:String,
    default: ""
  },
  quantity: {
    type: Number,
    default: 0
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'stores'
  },
  Deleted: {
    type: Number, // 1 - active  2 - inactive 3 - delete
    enum: [1, 2, 3],
    default: 1
  }

}, {
    timestamps: true
  });


const stock = mongoose.model('stocks', stockSchema);

module.exports = stock;