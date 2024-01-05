// const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
// const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true); // null means no error was there
  } else {
    cb(new AppError('Not an image. Please upload only images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 }, // we can only have one field named imageCOver
  { name: 'images', maxCount: 3 },
]);

// upload.single('image') req,file
// upload.array('images',5) req.files

// middleware to process the uploaded images
exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1. Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  // the updateOne fn which updates the tour has access to the req body therefore we put the imageCover name on the request body for it to access

  await sharp(req.files.imageCover[0].buffer) // imageCover is an array with a single object in it which contains the uploaded imageCover
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 }) // 90% quality of the original
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2. Other images
  // images is also an array of objects with each object corresponding to each uploaded image
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  next();
});

// CREATING A MIDDLEWARE FOR ALIASING
// this middle ware to is manipulate the query before it reaches the tourcontroller function that would render the top 5 cheapest tours
exports.aliasTopTours = (req, res, next) => {
  // we're pre filling the query string for the user that want
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// 🔴 reading data
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
// );

// THIS FN IS NOT NEEDED ANYMORE, ID ERRORS WILL BE HANDLED BY MONGODB
// exports.checkID = (req, res, next, val) => {
//   console.log(`tour id is : ${val}`);

//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'invalid id',
//     });
//   }
//   next();
// };

//creating a middleware function to check the body before creating a tour whether it has a name and a price
// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'missing name or price',
//     });
//   }
//   next();
// };

/*
exports.getAllTours = catchAsync(async (req, res, next) => {
  // console.log(req.requestTime);
  // tours => resource or endpoint
  // when someone hits this route, we'll send back jsend

  // 🔴 creating a copy of the request query
  // 🔴 BUILD THE QUERY
  // // (1) FILTERING
  // const queryObj = { ...req.query };
  // const excludedFields = ['page', 'sort', 'limit', 'fields']; // these are the fields that would be excluded from the query object

  // // 🔴  deleting the excluded fields from the query object
  // // the queryObj would now contain the filters where the sort, limit, fields and page would be eliminated
  // excludedFields.forEach((el) => delete queryObj[el]);

  // (2) ADVANCE FILTERING
  // let queryString = JSON.stringify(queryObj); // converting the query object into a string
  // queryString = queryString.replace(
  //   /\b(gte|gt|lte|lt)\b/g,
  //   (match) => `$${match}`,
  // );
  // the above expression would replace the words gte, gt, lte, lt with a $ sign before them; \b implies that the exact words should match; g implies that all the occurence should be replaced
  // the replace method has a callback fn as its 2nd argument which accepts the found words as its arguments
  // 🔴 here we are doing this replacement because the mongodb command for filtering has this $ sign

  // 🔴 getting all tours
  // let query = Tour.find(JSON.parse(queryString));
  // 🔴 req.query would get the filter from the query string
  // eg. localhost/api/vi/tours?duration=5&difficulty=easy

  // {difficulty: 'easy', duration: { $gte: 5}}
  // console.log(req.query);

  // const tours = await Tour.find()
  //   .where('duration')
  //   .equals(5)
  //   .where('difficulty')
  //   .equals('easy');

  // this would also return a promise whose resolved value is awaited

  // 🔴 SORTING
  // if (req.query.sort) {
  //   const sortBy = req.query.sort.split(',').join(' ');
  //   // multiple filter criteria are comma separated in the query while space separated in sort method
  //   // sort('price ratingsAverage')
  //   query = query.sort(sortBy);
  // } else {
  //   // default sort parameter
  //   query = query.sort('-createdAt');
  // }

  // 🔴 FIELD LIMITING
  // if (req.query.fields) {
  //   const fields = req.query.fields.split(',').join(' ');
  //   query = query.select(fields);
  //   // query = query.select('<space separated field names>'); would return only these fields
  // } else {
  //   query = query.select('-__v'); // this would exlude the __v field from the output rest everything would appear
  // }

  // 🔴 PAGINATION
  // const page = req.query.page * 1 || 1; // * converts str to num, if the user doesnt enter page value default would be page 1
  // const limit = req.query.limit * 1 || 100; // default number of items for every page would be 100
  // const skip = (page - 1) * limit;
  // // user wants page=2&limit=10 (page 2 with 10 items per page)
  // // 1-10 = page 1; 11-20 = page 2
  // // we need to skip 10results for getting page 2

  // if (req.query.page) {
  //   const numTours = await Tour.countDocuments(); // this would result a promise that would return the number of documents
  //   if (skip >= numTours) throw new Error('This page does not exixst');
  // }
  // query = query.skip(skip).limit(limit);

  // 🔴 EXECUTE THE QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  // this chaining is possible because we have all the methods returning "this" which would give the object to chain the method upon
  const tours = await features.query;

  // 🔴 SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length, //sending the number of objects in the array
    data: {
      // this contains the data received
      tours,
    },
    // requestedAt: req.requestTime,
  });
});
*/

/*
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id).populate('reviews');
  // guides initially contains only the IDs and now with populate we would populate the guides field with the corresponding user document (only for the query and not for the original tour document)
  // Tour.findOne({_id:req.params.id})

  if (!tour) {
    return next(new AppError('No Tour Found with that ID', 404));
    // as soon as next receives something it asssumes that it is an error and it will then jump directly to the global error handling middleware which will send the response for us
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });

  // console.log(req.params); // the variables in the url are called parameters
  // 🔴  req.params creates this object using the id imput in the url => { id : 5}
  // 🔴 if we define multiple variables, multiple items will be created in the object corresponding to the variable
  // 🔴 making a variable option => ...tours/:id/:x/:y?
  // const id = req.params.id * 1; //converting the string to the number
  // const tour = tours.find((el) => el.id === id);
});
*/
/*
exports.createTour = catchAsync(async (req, res, next) => {
  // creating a new tour from the model
  // const newTour = new Tour({});
  // newTour.save()
  // shorter way
  const newTour = await Tour.create(req.body);
  // the create method is directly called on the Tour model and the request body is passed as the data, that would return a promise whose resolved value is awaited and stored in the newTour
  
  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
  */

// sending data from the client to the server, data available on req(holds all info about the request done (including data that is send)))
// console.log(req.body);

// const newId = tours[tours.length - 1].id + 1;
// // in databases, id generation is usually taken care of automatically, here we have to manually give it an id
// const newTour = Object.assign({ id: newId }, req.body); //merging two objects to create new

// // pushin this tour into the tours array
// tours.push(newTour);

// // making changes in the file
// fs.writeFile(
//   `${__dirname}/dev-data/data/tours-simple.json`,
//   JSON.stringify(tours),
//   (err) => {
//     res.status(201).json({
//       status: 'success',
//       data: {
//         tour: newTour,
//       },
//     });
//   },
// ); // since we are in a callback fn
// });

/*
  exports.deleteTour = catchAsync(async (req, res, next) => {
  // 204 means no content since we're not sending any data back
  
  const tour = await Tour.findByIdAndDelete(req.params.id);
  
  // in a restful api we dont send any data to the client upon deletion
  
  if (!tour) {
    return next(new AppError('No Tour Found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
*/

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour); // we have created the handleFactory module to handle the delete controllers for all the routes by one fn only

exports.getTourStats = catchAsync(async (req, res, next) => {
  // 🔴 .aggregate would return an aggregate object
  const stats = await Tour.aggregate([
    // defining the stages
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        // toUpper would display the difficulty in uppercase
        // id is used to define what would be the grouping criteria, null stands for no grouping condition and all the data will be considered
        numTours: { $sum: 1 },
        // the above line calculates the total number of tours in the collection, while each document goes through this pipeline it is assigned the number 1 which is then summed up for all the documents
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        // at this point we have to use the field names we specified above bcz they are the ones that exist now
        avgPrice: 1,
        // 1 means ascending
      },
    },
    // repeating stages
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // selecting all the documents that are not easy ($ne = NOT EQUAL)
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
      // unwind destructures an array and returns one document for each entity of the array
      // the fiels we want to unwind is startDates
      // suppose we have 3 start dates for a tour then it would return 3 tours one for each start date
    },
    {
      // select the documents for the year that was passed in
      $match: {
        startDates: {
          // user would enter an year for which we need the tours , the following criteria makes sure that the tours that are selected are in that year only
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        // we want to group by month using $month
        // $month => (extract a month out of a date) returns the month for a date as a number between 1 (january) and 12 (december)
        _id: { $month: '$startDates' },
        // now we need to calculate how many tours were there in that month
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
        // this would create an array and keep pushing the matched documents's name in that array for that month
      },
    },
    {
      $addFields: {
        month: '$_id',
      },
    },
    {
      $project: {
        _id: 0,
      },
      // this makes the id of all documents 0
    },
    {
      $sort: { numTourStarts: -1 },
      // would sort the final collection in descending order based on numTourStarts
    },
    {
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/34.1175,-118.3547/unit/:unit
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // this conversion is necessary because mongoDb expects the radius in radians (passed to the $centerSphere in $geoWithin)

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400,
      ),
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    // we need to find tours whose startLocation is withing the radius of a certain point(location passed by user -> latlng)
    // so the centreSphere is the geometry with center at lat,lng and radius = radius and the $geoWithin finds all documents within this geometry
    // we also need to specify index for the startLocation field for this to work
  });
  // geoWithin finds documents within a certain geometry
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400,
      ),
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  /*
      $geoNear: {
        // this is the only geospatial aggregation pipeline that exists and it always needs to be the first one
        // it also requires that at least on of the fields uses geospatial index
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        }, // point from which to calculate the distances
        distanceField: 'distance', // this is the name field that will be created and where all the calculated distances will be stored
        distanceMultiplier: 0.001, //this is the number which will be multiplied by all the distances
      },
    },
    {
      $project: {
        // name of the fields that we want to keep in the output
        distance: 1,
        name: 1,
      },
    },
  ]);*/

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
