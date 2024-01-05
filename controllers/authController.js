const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

// 🔴 COOKIE - s cookie is basically a small piece of text that a server can send to the client. The client would store the cookie and send the same cookie along with all the future requests to the server

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // sending a cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000, // converting to ms
    ),
    // secure: true, // the cookie would be sent only on an encrypted connection (https)
    httpOnly: true, // this would ensure that the cookie cannot be modified in any way by the browser  (it would only receive it, store it and send it along with requests it cannot delete it)
  };

  // res.cookie(<name of the cookie><data that we want to send in the cookie>, <options>)
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined; // so that the password doesn't appear in the response body

  // 🔴 jwt.sign(<PAYLOAD>, <SECRET KEY(STRING)>, EXPIRATION DURATION OBJECT)

  res.status(statusCode).json({
    status: 'Success',
    token, // sending the token to the client
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  // doing this would now not allow everybody to register as admin, i.e. we register a user now based only on his email and password and name

  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  // 🔴 Now the user should be logged in as soon as he signs up
  // PAYLOAD => object for all the data that we want to store in the token
  // here we only want ID
  createAndSendToken(newUser, 201, res);

  // 🔴 jwt.sign(<PAYLOAD>, <SECRET KEY(STRING)>, EXPIRATION DURATION OBJECT)
});

// Logging in a user =?> sign a JSON web token and sending it back to the user
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if the email and password exist
  if (!email || !password) {
    // create a new error and the global error handling middleware will catch this error
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Check if the user exists and if the password is correct
  const user = await User.findOne({ email: email }).select('+password'); // {email : email} // here we are searching for the user in the database using the user's email id
  // the "user" here would store all the data of that user if found

  // since the password field was set as select:false, so here we need to manually select that field in order to get access to that password for authentication

  // checking the password using bcrypt
  // user is the found document so it can use the correctPassword method

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email/password', 401)); // 401 stands for unauthorized
  }

  // 3. if everything is okay send the JWT back to the client
  createAndSendToken(user, 200, res);
});

// 🔴 IMPLEMENTING THE LOGOUT
// the cookie which we sent from the server is httpOnly : true which means it cannot be deleted in the browser so to implement the logout feature what we are doing is creating a new cookie whose value is a dummy text and not the token which was received, now this new cookie will be sent to the server along with the future requests and since it doesnt contain that token, we wont get access to the protected routes
exports.logout = (req, res) => {
  res.cookie('jwt', 'logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// 🔴PROTECTING THE ROUTES
exports.protect = catchAsync(async (req, res, next) => {
  // step 1 -> get the token and check if its there
  let token;
  if (
    // the folowing is when we test the api in postman
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
    // if the header from the request body has an Authorization whose value starts with Bearer that means a token has been sent from the server
  ) {
    token = req.headers.authorization.split(' ')[1];
    // the value of the token is the string which follows the Bearer, so wer'e getting that above
  } else if (req.cookies.jwt) {
    // this is when we get the jwt as a cookie while actually using the API
    token = req.cookies.jwt;
  }
  // console.log(token);

  // if the token doesn't exists, it means that the user is not logged in (because the authorization header is only received when the user is logged in)
  if (!token) {
    return next(
      new AppError('You are not logged in! Please login to get access.', 401),
    );
  }

  // step 2 -> verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // promisify is built in in Node which helps to promisify a fn whose value is awaited and stored in decoded
  // jwt.verify(<token>,<JWT secret>,<callback fn>)
  // console.log(decoded);

  // the decoded object contains the id in its first index

  // step 3 -> if the user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The user beloging to the token no longer exists', 401),
    );

  // sttep 4 -> check if user changed password after the token was issued
  // we would create an instance method for this task (in userModel)
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    // iat -> issued at
    // this would return true if the user changed the password
    return next(
      new AppError('User recently changed password. Please login again!'),
    );
  }

  // grant access to the protected route now which is next
  req.user = currentUser; // this is cruicial for next step to take place
  res.locals.user = currentUser; // now we have access to the current user in the pug templates
  next();
});

// 🔴 this is only for checking if the user is logged in. Only for rendered pages, not for protected routes; no error.
exports.isLoggedIn = async (req, res, next) => {
  try {
    // 1. verify the token
    if (req.cookies.jwt) {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2. check if the user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();

      // sttep 4 -> check if user changed password after the token was issued
      // we would create an instance method for this task (in userModel)
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A USER LOGGEIN IS if all of the above satisfy
      // if it is so then make then user accesible to the template
      // every pug template has access to req.locals
      res.locals.user = currentUser; // now we have access to the current user in the pug templates
      return next();
    }
  } catch (err) {
    // we dont want to catch an error here while logging out and send it to the global error handling middleware
    return next();
  }
  next();
};

// we'll now implement authorization, that is giving certain rights not to all the logged in users (for eg. deleting a tour)
exports.restrictTo =
  (
    ...roles // returning a middleware fn - because we cannot directly pass arguments into the middleware fn
  ) =>
  (req, res, next) => {
    // roles is an array ['admin','lead-guide']; say. role="user" - no permission
    if (!roles.includes(req.user.role)) {
      // if the role of the current user is not there in the specified list, then dont grant access to delete
      return next(
        new AppError('You do not have permission to perform this action', 403),
      ); // 403 means forbidden
    }

    // if its there, go to the next middleware which is for deleting the tour
    next();
  };

// 🔴 Implementing the password reset functionality
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  // console.log(user);
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2. generate the random reset token
  // eslint-disable-next-line no-unused-vars
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // this would deactivate all the validators we have in our schema (required for eg)

  // 3. send it back to user's email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later'),
      500,
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. get user based on the token
  // encrypt the token and compare it with the encrypted one in the database
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // query the database for this token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // check if the token has not yet expired
  });

  // 2. set the new password if token has not expired and there is a user
  if (!user) {
    return next(new AppError('token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // we want validation this time

  // 3. update the changedPasswordAt property for the current user

  // 4. log the user in. Send the JWT to the client
  createAndSendToken(user, 200, res);
});

// 🔴 IMPLEMENTING THE UPDATE PASSWORD FOR LOGGED IN USERS
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. get user from the collection
  const user = await User.findById(req.user.id).select('+password'); // by this point of time we have the user logged in and so available in the request body; password field is explicitly selected since its not selected bu default

  // 2. check if the posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // 3.if correct then updatet the pass
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate() wont work here because validation wont work (since it works only for create and save), also all the instance methods wont work which are responsible for the encryption of the password

  // 4. log the user in, send JWT
  createAndSendToken(user, 200, res);

  // ask for the current password before updating it
});
