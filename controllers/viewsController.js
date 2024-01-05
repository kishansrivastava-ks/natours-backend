const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1. get all the tour data from collection
  const tours = await Tour.find();

  // 2. build the template

  // 3. render that template using the tour data fron step 1
  res.status(200).render('overview', {
    // this object is going to get passed into the overview template therefore that template has access to the tours passed here
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // * always when we have async fn inside catchasync, we should have "next"
  // 1. get the data for the requested tour (including reviews and tour guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }

  // 2.build the template

  // 3.render template using the data from step 1
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "connect-src 'self' https://cdnjs.cloudflare.com",
    )
    .render('login', {
      title: 'Log into your account',
    });
};

exports.getAccount = (req, res) => {
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "connect-src 'self' https://cdnjs.cloudflare.com",
    )
    .render('account', {
      title: 'Your Account',
    });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1. find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2.find tours with the returned IDs
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "connect-src 'self' https://cdnjs.cloudflare.com",
    )
    .render('account', {
      title: 'Your Account',
      user: updatedUser,
      // we need to do this because the previous user was being accessed from the protect middleware so we need to give access to an updated user
    });
});
