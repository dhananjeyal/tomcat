const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const invoicesSchema = new Schema({
  invoiceNo: {
    type: String,
    unique: true
  },
  sufix: {
    type: Number,
    default: 0
  },
  billDate: {
    type: Date
  },
  taxNumber: {
    type: String
  },
  invoiceAddress: {
    type: String
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'stores'
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'customers'
  },
  total: {
    type: Number
  },
  discount: {
    type: Number
  },
  tax: {
    type: Number
  },
  discountAmount: {
    type: Number
  },
  taxAmount: {
    type: Number
  },
  subTotal: {
    type: Number
  },
  saledBy: {
    type: Schema.Types.ObjectId,
    ref: 'users'
  },
  // serialNo: {
  //   type: Array
  // },
  products: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'products'
    },
    // productName: {
    //   type: String
    // },
    // location: {
    //   type: String
    // },
    // serialNo: {
    //   type: String
    // },
    // quantity: {
    //   type: Number
    // },
    price: {
      type: Number
    }
  }],
  invoiceDelete: {
    type: Number, // 1 - active 2 - delete
    enum: [1, 2],
    default: 1
  },
  priceType: {
    type: String,
    enum: ['rupees', 'dollor', 'dinar', 'pounds', 'euro']
  }

}, {
  timestamps: true
});

// creating index 
invoicesSchema.index({
  "invoiceNo": 1,
  "billDate": 1,
  "storeId": 1,
  "invoiceDelete": 1,
  "customerId": 1

});

const invoice = mongoose.model('invoices', invoicesSchema);

module.exports = invoice;