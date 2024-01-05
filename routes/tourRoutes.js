const express = require('express');
const tourController = require('../controllers/tourController');
// tourController now contains all the handler methods exported from the tourController.js module
const router = express.Router(); // the middle ware fn
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

//🔴 param middleware is a middlware that runs only for certain parameters in the URL
// router.param('id', tourController.checkID);

/*
create a checkBody middleware
check if body contains name and price properties
if not, send back 404 (bad request)
add it to the post handler stack 
*/

// POST /tour/tourID/reviews -> this is how we want to review a tour
// the tour id should be in the url and the user id should come from the currently logged in user

// this nested route means to access the reviews resource on the tours resource

// GET /tour/tourID/reviews -> should get all the reviews for this tour
// GET /tour/tourID/review/reviewID -> to get a particular review

router.use('/:tourId/reviews', reviewRouter); // the router is just a middleware so we can use the "use" method on it.
// the above lines tells the router that whenever it encounters a route like this -> '/:tourId/reviews' it should use the reviewRouter

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );
// :year is a url parameter which can be accessed by req.params.year

// by the following route, we want all the tours which lie within the given distance of the user location
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

// by the following route we would calculate the distance of a certain point (latlng) to all the tours we have in our collection
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours) // we will insert a middleware here which will check whether the user is logged in, if not it will return an error, but if logged in, user would get access to all tours (this would protect the route from from unauthorized access)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  ); // 🔴 chaining multiple middlewares, would check the body first before creating a tour
//route('/') would mean /api/v1/tours over here since the tourRouter is defined on that root

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect, // to check if the user is logged in
    authController.restrictTo('admin', 'lead-guide'), // the admin and the lead guide only will be able to delete a tour
    tourController.deleteTour,
  );
// the protect would check whether the user is logged in and the restrictTo would check whether he has the rights to delete the your

// exporting the router
module.exports = router;
