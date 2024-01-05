// const catchAsync = require('../utils/catchAsync');
const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

/* 
exports.getAllReviews = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.tourId) filter = { tour: req.params.tourId };

  // if theres' gonna be a regular call to this route then the filter object would be empty and we would get all the reviews
  // but if the route contains the tourId then the filter object would contain that tour id and the reviews we get would be only for that tour

  const reviews = await Review.find(filter);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});
*/

/*
if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  since we have created a factory handhler for the create method, we are moving these two lines to its separate fn (because they are additional to the create fn in the factory) which would then run as a middle ware
  // Allow nested routes
  exports.createReview = catchAsync(async (req, res, next) => {
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id; // we get the req.user from the protect middleware
  // if the user doesn't give a tour or a user in teh body then it is taken from the url and the protect middleware
  
  const newReview = await Review.create(req.body); // creating a new review from the request body
  
  res.status(201).json({
    status: 'success',
    data: {
      review: newReview,
    },
  });
});
*/
exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id; // we get the req.user from the protect middleware
  // if the user doesn't give a tour or a user in teh body then it is taken from the url and the protect middleware
  next();
};
exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
