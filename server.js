const mongoose = require('mongoose');

const dotenv = require('dotenv');
//for using the environment variables
// dotenv.config(<path where our configuration file is located>)

process.on('uncaughtException', (err) => {
  console.log('Uncaught exception! Shutting down 🔴 ');
  console.log(err.name, err.message);
});

dotenv.config({ path: './config.env' });
// 🔴 this would read the variables from the file and would save them as nodejs environment variables

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// 🔴 CONNECTING OUR REMOTE DATABASE
mongoose
  .connect(DB, {
    // options to deal with some deprecation warnings
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    // the connect would return a promise which is handled here
    // this also receives the connection object
    // console.log('DB connection successful');
  });

// new document created out of the Tour model
// this is an instance of the Tour model
// const testTour = new Tour({
//   name: 'the park camper',
//   price: 997,
// });

// // this will save it to the tours collection in the database
// // this will return a promise and the document which is going to be stored in the collection
// testTour
//   .save()
//   .then((doc) => {
//     console.log(doc);
//   })
//   .catch((err) => {
//     console.log('Error 🔴 :', err);
//   });

const app = require('./app');

// console.log(app.get('env'));
// gives the environment variable which is "development" here
// console.log(process.env);

// 🔴 starting the server
const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`app running on port ${port}`);
});

// 🔴 HANDLING UNHANDLED REJECTION IN THE APPLICATION
// whenever there is an unhandled rejection then the process will emit an object called "unhandled rejection" and then we can subcribe to that event
process.on('unhandledRejection', (err) => {
  console.log('unhandled exception! Shutting down 🔴 ');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// console.log(x);
