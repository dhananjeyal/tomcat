const mongoose = require('mongoose'),
  Schema = mongoose.Schema;


const productSchema = new Schema({

  name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  detail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ""
  },
  serialNo: {
    type: String,
    required: true

  },
  retail: {
    rupees: {
      type: Number,
      default: 0
    },
    dollor: {
      type: Number,
      default: 0
    },
    dinar: {
      type: Number,
      default: 0
    },
    pounds: {
      type: Number,
      default: 0
    },
    euro: {
      type: Number,
      default: 0
    }
  },
  wholesale: {
    rupees: {
      type: Number,
      default: 0
    },
    dollor: {
      type: Number,
      default: 0
    },
    dinar: {
      type: Number,
      default: 0
    },
    pounds: {
      type: Number,
      default: 0
    },
    euro: {
      type: Number,
      default: 0
    }
  },
  weight: {
    stone: {
      type: String,
      default: 0
    },
    gold: {
      type: String,
      default: 0
    },
    gross: {
      type: String,
      default: 0
    }
  },
  size: {
    type: String,
    default: 0
  },
  measurement: {
    length: {
      type: String,
      default: 0
    },
    width: {
      type: String,
      default: 0
    },
    height: {
      type: String,
      default: 0
    }
  },
  image: {
    type: String,
    default: ''
  },
  storeId: {
    type: Schema.Types.ObjectId, //Product belong to which store
    ref: 'stores'
  },
  userId: {
    type: Schema.Types.ObjectId, //AdminId product added by admin only
    ref: 'users'
  },
  sale: {
    type: Number,
    enum: [1, 2], /// 1 - Not saled, 2 - saled
    default: 1
  },
  productStatus: {
    type: Number, // 1 - active  2 - delete
    enum: [1, 2],
    default: 1
  },
  currentLocation: {
    type: String,
    default: "none"
  },
  stoneDescription: {
    type: String,
    default: "none"
  },
  status: {
    type: String,
    default: "none"
  },

}, {
  timestamps: true
});

// creating index 
productSchema.index({
  "serialNo": 1,
  "productStatus": 1,
  "sale": 1,
  "location": 1
});

const product = mongoose.model('products', productSchema);

module.exports = product;