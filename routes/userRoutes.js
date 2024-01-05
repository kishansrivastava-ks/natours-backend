const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// 🔴 Defining the routes for authentication
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword); // this  would receive the email address
router.patch('/resetPassword/:token', authController.resetPassword); // this would receive the token as well as the new password

router.use(authController.protect); // this would protect all the routes that come after this point (a middleware) because these are all a stack of middlewares

router.patch('/updateMyPassword', authController.updatePassword);

router.get(
  '/me',
  userController.getMe, // middleware to set the id in the params to the currently logged in user id
  userController.getUser,
);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);

// Other routes (REST format)

router.use(authController.restrictTo('admin')); // restrict the following routes to admin only
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
