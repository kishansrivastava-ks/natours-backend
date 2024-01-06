const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// 🔴 creating a user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    // this would tranform the input email into lower case
    validate: [validator.isEmail, 'Please provide a valid email'],
    // this would check if the entered email address is valid
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, // the password would now not show up in any output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // 🔴 This only works on CREATE and SAVE!!! => User.create() which is used to create new user
      //   this validator fn is to check whether the passwords entered are same
      validator: function (el) {
        // this fn is called when a new document is created
        return el === this.password;
      },
      message: 'Passwords are not the same!', // error msg
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    // this active would be set to false when the user deletes his account
    type: Boolean,
    default: true,
    select: false,
  },
});

// 🔴 IMPLEMENTING THE ENCRYPTION (using pre middleware)
userSchema.pre('save', async function (next) {
  // encrypting the password only when it is created or updated

  // if the password has not been modified then just skip this fn and move to next middleware
  if (!this.isModified('password')) return next();

  // else hashing using hashing Algorithm Bcrypt
  this.password = await bcrypt.hash(this.password, 12); // 12 is the cost value (default is 10)

  //   deleting the confirmed password from the database
  this.passwordConfirm = undefined;

  next();
});
// this pre-save middleware runs b/w getting the data and saving it in the database, which is the perfect time to encrypt the data

userSchema.pre('save', function (next) {
  // this function would run right before a new document is saved
  if (!this.isModified('password') || this.isNew) return next(); //if we didn't modify the password property or if the document is new then do not change the passwordChangedAt field

  this.passwordChangedAt = Date.now() - 1000; // this is because saving the document is quite slower than issueing the JWT
  next();
});

// 🔴 creating a query middleware to filter out the inactive user when the someone request for the userlist
userSchema.pre(/^find/, function (next) {
  // this middleware would run before every "find" query
  // "this" points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// 🔴 creating an instance method (one which is available on all documents of a collection)
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  // this.password would not be available since it is select:false
  return await bcrypt.compare(candidatePassword, userPassword);
  // this compare fn will encrypt the entered password and compare it with the one in the database (since there is no way to get the password out of the encrypted one)
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  // JWTTimeStamp is the time when the token was issued
  if (this.passwordChangedAt) {
    // this points to the current document so we have access to the properties
    // this means that user has changed the password
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    // console.log(changedTimeStamp, JWTTimeStamp);
    return JWTTimeStamp < changedTimeStamp; // this means that the password was changed after the jwt token was issued. only then can jwt token have time stamp less than the changed time stamp
    // so if this returns true, that means the password was changed
  }
  return false; // means the user has not changed password after the token was issued
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  // this token is basically send back to the user when he requests for a password change. This token would authorize the user to change his password. Here we have generated a 32 character long cryptographically encoded code, and converted it into a hexadecimal string

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // eslint-disable-next-line no-console
  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken; // returning the plain text token
};

// Creating model out of the schema
const User = mongoose.model('User', userSchema);

module.exports = User;
