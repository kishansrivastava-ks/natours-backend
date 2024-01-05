const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
// eslint-disable-next-line import/no-extraneous-dependencies
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express(); // add a bunch of methods to the app variable

// setting up the pug template
app.set('view engine', 'pug'); // this pug is a template engine which is used to make websites using templates (this doesn't need to be installed anywhere)
// pug templates are called views in express
app.set('views', path.join(__dirname, 'views'));

// 🔴 GLOBAL MIDDLEWARES

// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static('directory from which we want to serve the static files'))

// SET SECURITY HTTP HEADERS
app.use(helmet());

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self' https://cdnjs.cloudflare.com https://js.stripe.com",
  );
  next();
});

console.log(process.env.NODE_ENV);

// DEVELOPMENT LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); //morgan(dev) will return a handler function
}

// 🔴 Creating a rateLimit middleware which would see that if there are a lot of requests made from a particular IP then it would block the further requests
const limiter = rateLimit({
  // this limiter is a middleware fn
  max: 100,
  windowMs: 60 * 60 * 1000, // this would allow 100 request from the same IP in 1 hour
  message: 'Too many requests from this IP! Please try again in an hour.',
});
app.use('/api', limiter); // this would affect all the routes

// Body parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' })); // 🔴 middleware - a fn that thea modify the incoming request data

// we use a parser to parse the data from the update user form (we will not be able to read the data as such received from the form)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// if we have a request body larger than 10kb then it wont be accepted
app.use(cookieParser()); // this parses the data from the cookies

// ❗❗ DATA SANITIZATION AGAINST NOSQL QUERY INJECTION
// for eg {"email": {"$gt": ""}} would always be true so if this is there in the email field along with a password that matches any of the documents, then we would be logged in with that user
app.use(mongoSanitize()); //this would filter out all of the nosql ($) query from the request

// ❗❗ DATA SANITIZATION AGAINST CROSS SITE SCRIPTING ATTACKS (XSS)
app.use(xss()); // this would clean the input from any malicious html input

// test
// PREVENTING PARAMETER POLLUTION
// e.g./api/v1/tours?sort=duration&sort=price
app.use(
  hpp({
    // this would not allow duplicates in the query string
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ], // except for these query
  }),
);

//this is used to access the static files from the directory

// 🔴 app.use(<function that we want to add to the middle ware stack>)
// app.use((req, res, next) => {
// next = next function of middleware
// it is used to move to the next middleware in the middleware stack
//   console.log('hellow from the middleware 🔥');
//   next();
// });

// test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

/*
app.get('/', (req, res) => {
  //   res.status(200).send('hello from the server side'); //sends the string back to the client
  // get is the http method for the request

  //we can also send json
  res
    .status(200)
    .json({ message: 'hello from the server side', app: 'natours' });
  // this will automatically set our content type to application/json
}); //root url

// another http method - post
app.post('/', (req, res) => {
  res.send('you can post to this endpoint');
});
*/

// 🔴 receiving and parsing the data into a javascript object

// 🔴 ROUTE HANDLER FUNCTIONS

//🔴 ROUTES (these routehandlers are also middlewares)
// app.get('/api/v1/tours', getAllTours);
//🔴 defining routes that can accept variables

// app.get('/api/v1/tours/:id', getTour);

// handling the post request (creating a new tour)
// app.post('/api/v1/tours', createTour);

//🔴 using patch to update data
// with put we expect an entire updated object and with patch we expect only a property of an object that is updated
// app.patch('/api/v1/tours/:id', updateTour);

// 🔴 HANDLING DELETE REQUESTS
// app.delete('/api/v1/tours/:id', deleteTour);

//🔴 MOUNTING THE ROUTERS

// app.use('routes for which the middleware is to be used', the middleware function)
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// 🔴 this is the route handler for all the routes other than what we specified
// * means all the HTTP methods(get, post,patch etc)
// we have written it here because if the execution has reached here it menas that the above two routes handlers couldnt be matched so there is a route which is not specified
app.all('*', (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server`, 404));
  // if we pass any argument to the next() method it will assume that it is an error. It will then stop the execution of all the other middlewares and send that agrument as an error to the global error handling middleware
});

// 🔴 THE GLOBAL ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);
module.exports = app;
// defining route - to determine how an application would respond to a certain url and http method
