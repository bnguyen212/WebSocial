var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var connect = process.env.MONGODB_URI;
var crypto = require('crypto');
mongoose.connect(connect);

var hashPassword = function(password) {
  var hash = crypto.createHash('md5');
  hash.update(password+"ThorLoki");
  return hash.digest('hex')
};

var userSchema = mongoose.Schema({
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  phone: {
    type: String,
    minlength: 10,
    maxlength: 10,
  },
  facebookID: String,
  pictureURL: String,
  twitterID: String,
  twitterToken: String,
  twitterTokenSecret: String,
  followers: Object,
})
userSchema.plugin(findOrCreate);

var contactSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    minlength: 10,
    maxlength: 10,
    required: true
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
})

var messageSchema = mongoose.Schema({
  created: {
    type: Date,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  contact: {
    type: mongoose.Schema.ObjectId,
    ref: 'Contact',
    required: true
  },
  channel: {
    type: String,
    enum: ['SMS'],
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'received'],
    required: true
  },
  from: {
    type: String,
  }
})

var User = mongoose.model('User', userSchema);
var Contact = mongoose.model('Contact', contactSchema);
var Message = mongoose.model('Message', messageSchema);

module.exports ={User: User, hashPassword: hashPassword, Contact: Contact, Message: Message};