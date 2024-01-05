const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // file here is req.file
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-6876dfssdf78sdsadr-<current time stamp>.jpeg -> two make sure there are no two photos with the same file name even if the same user uploads it
//     const ext = file.mimetype.split('/')[1]; // image/jpeg ka jpeg wala part
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = multer.memoryStorage(); // with this the image will now be stored as a buffer and not directly to the file system

// multer filter
const multerFilter = (req, file, cb) => {
  // the goal of this fn is to check whether the uploaded file is an image. If so the then we pass to the callback (cb) fn, if not then false is passed along with an error
  if (file.mimetype.startsWith('image')) {
    cb(null, true); // null means no error was there
  } else {
    cb(new AppError('Not an image. Please upload only images', 400), false);
  }
};

// multer is used as a middleware to upload images to a route
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// this middleware is then used before the updateMe route

exports.uploadUserPhoto = upload.single('photo');
// upload.single('photo') -> single image is being uploaded and the field where it is being uploaded is called photo in the form

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`; // we had to do this because the multer storage is now the memoryStorage and not the diskStorage so we need to explicitly define the filename property on the file object

  // image resizing
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 }) // 90% quality of the original
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  // ...allowedFields would create an array of all the other arguments that we passed in

  // 🔴 this fnc would filter the current object (obj) makeing sure that the returned object only contains the feilds specified in the allowedFields

  Object.keys(obj).forEach((el) => {
    // looping through an object
    // Object.keys() would return an array containing all the keys specified inside the object
    // if the allowed fields array inlcudes that key then it is stored along with the key in the new object
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

// its typical for a web application to update the user password at one place (here authController) and other details at one place (here userController)
exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file); // the upload middleware has put the image on the request
  // console.log(req.body);

  // 1. create an error if the user tries to update the password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates! Please use /updatepMyPassword',
        400, // bad request
      ),
    );
  }

  // 2. Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email'); // we need only the name and email field out of all the fields

  if (req.file) filteredBody.photo = req.file.filename; // updating the photo propety of the filteredObj for updating the document after image upload

  // 3. update the user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // this would make sure that a new updated document is returned and not the old one
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// 🔴 DELETING A USER -> usually means we would deactivate the user so that he maybe able to recover his account in the near future if he wants to
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    // 204 means deleted
    status: 'success',
    data: null,
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id; // the getOne fn of the factory will be using the id from the params. So we are setting that to the current logged in user id so that we can get the currently logged in user info from that very same handler fn
  next();
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'this route is not defined. Please use Sign Up instead',
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User); // Do not update passwords with this
exports.deleteUser = factory.deleteOne(User); // this delete method is meant for the administrator to permanently delete a user
