const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1.get the currently booked tour
  const tour = await Tour.findById(req.params.tourID);

  //   2. create the checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourID
    }&user=${req.user.id}&price=${tour.price}`, // user will be redirected to this url after success payment
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`, // page to go in case of cancelled payment
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,
    mode: 'payment',
    // allow us to pass in some data about the session we're currently creating
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],

    //   line_items: [
    //     // info about the product that the user is about to purchase
    //     {

    //       name: `${tour.name} Tour`,
    //       description: tour.summary,
    //       images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
    //       amount: tour.price * 100,
    //       currency: 'usd',
    //       quantity: 1,
    //     }
    //   ]
  });

  //   3.create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // this is only temporary because its unsecure, everyone can make booking without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]); // redirect creates a new request to this new url
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
