const mongoose = require('mongoose'),
  bcrypt = require('bcrypt-nodejs'),
  Schema = mongoose.Schema;

require('mongoose-type-email');

const userSchema = new Schema({
  userName: {
    type: String,
    //unique: true
  },
  managerName: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  profilePhoto: {
    type: String,
    default: 'manager.png'
  },
  role: {
    type: String,
    enum: ['admin', 'Manager'],
    default: 'Manager'
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'stores'
  },
  accountStatus: {
    type: Number, // 1 - active 2 - inactive 3 - delete
    enum: [1, 2, 3],
    default: 1
  },
  lastlogin: {
    type: Date
  }

}, {
    timestamps: true
  });

//method to encrypt password
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

//method to decrypt password
userSchema.methods.validPassword = function (password) {
  let userData = this;
  return bcrypt.compareSync(password, userData.password);
};

// creating index 
userSchema.index({
  'createdAt': 1,
  'updatedAt': 1,
  'userName': 1
});

const user = mongoose.model('users', userSchema);

module.exports = user;