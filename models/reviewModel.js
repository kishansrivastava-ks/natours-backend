// review  | rating | createdAt | ref to tour | ref to user

const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    //   Implementing parent referencing
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // this would ensure that when were renderind data as JSON or as object, the virtual properties are also displayed
    // Virtual property -> a field that is not stored in the database but is calculated using some other value
  },
);

// we want that one user should be able to give only one review to a particular tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // this makes sure that each combination of a tour and a user has to be unique

// Implementing the pre(find) middleware to populate the routes upon query
reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  //   when we want to populate multiple fields we need to use populate multiple times

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// 🔴 CREATING A STATIC METHOD
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // we made this method static because we wanted to use the aggregate method on the model
  // and in a static method, the this keyword points to the current model
  const stats = await this.aggregate([
    {
      // select all the reviews that belong to the tourId that was passed in as argument
      $match: { tour: tourId },
    },
    {
      // calculate the statistics
      $group: {
        _id: '$tour', // group by tour
        nRating: { $sum: 1 }, // add 1 for each document found (that would sum of to the total no of ratings on a tour)
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);
  // [ { _id: 658a69b3dc96fd5bdc0443c9, nRating: 3, avgRating: 3 } ] this is the stats array

  // we need to now persist this stats into the tour document
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function (next) {
  // post would make sure that the document is first saved and then the calculations are performed on it
  // this points to the document that is currently being saved (current review)
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndDelete
// findByIdAndUpdate
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // this here points to the current query (because this is a query middleware) and not the model, but we need the model to make the changes
  // we can execute the query and that would then give the document that is currently being processed
  this.r = await this.findOne(); // this would return the current review document
  // we have made it this.r because we need to access this r in the next (post) middleware so we made the r as a property to be accesible ahead
  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function (next) {
  // this is the right time to call the calcAverageRating fn because by this point, the query has been executed
  // so await this.findOne() -> does not work here
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

// POST /tour/tourID/reviews -> this is how we want to review a tour
// the tour id should be in the url and the user id should come from the currently logged in user

// this nested route means to access the reviews resource on the tours resource

// GET /tour/tourID/reviews -> should get all the reviews for this tour
// GET /tour/tourID/review/reviewID -> to get a particular review
