const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');

// 🔴 CREATING A SCHEMA FOR OUR TOURS
const tourSchema = new mongoose.Schema(
  {
    name: {
      // schema for the name field
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      // reuire: [true/false, "error message"]
      trim: true,
      maxlength: [
        40,
        'a tour name must have less than or equal to 40 characters',
      ],
      minlength: [
        10,
        'a tour name must have more than or equal to 10 characters',
      ],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
    },
    ratingsAverage: {
      type: Number,
      deafult: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // this would run each time a new value (val) is set to this field
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    pirceDiscount: Number,
    summary: {
      type: String,
      trim: true,
      // trim only works for strings removing all white spaces from beginning and end of the string
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    // this means that the "images" would be an array of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
      // select false would not render the createdAt field while querying for the data
      // in JS this would return no. of milliseconds but here in mongoose this would be immediately converted into a date format
    },
    startDates: [Date], // the different dates at which the tour starts
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // mongoDB uses GeoJSON in order to specify geolocation data
      // 🔴 the following object is required to create a geolocation data in mongoDB
      type: {
        type: String,
        default: 'Point', // we can even specify other geometries like lines, polygons etc
        enum: ['Point'],
      },
      coordinates: [Number], // this array(of numbers) would be the coordinates of the points with the lng first and then the lat
      address: String,
      description: String,
    },
    // by specifying the following array of objects, it would create a branc new document inside the parent document (Embedding)
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId, // we expect each element of this array to be of the type mongoDB ID
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // this would ensure that when were renderind data as JSON or as object, the virtual properties are also displayed
    // Virtual property -> a field that is not stored in the database but is calculated using some other value
  },
);

// 🔴 CREATING INDEXES
// creating an index for a particular query would actually help mongoDb to save its time while querying for the documents. It would then not have to search all the documents for that query but would search according to the index specified
// tourSchema.index({ price: 1 }); // 1 means ascending order; -1 -> descending
// this was for a single query
// we can also make a compund index for a compound query
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // 2dsphere is used for real life location data as on earth

// 🔴 VIRTUAL PROPERTIES
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
  // this creates a durationWeeks property which has the no of weeks of the tour based on its "duration" in days
  // 🔴 we cannot query for virtual properties
});

// 🔴 VIRTUAL POPULATE
tourSchema.virtual('reviews', {
  ref: 'Review', // name of the model we want to reference
  foreignField: 'tour', // this is the field in the other model where the reference to the current model is stored
  localField: '_id', // where that id is stored in the current (tour) model (id in this local model is called tour in the other model)
});

// 🔴 DOCUMENT MIDDLEWARES - runs before the save() command and .create() command but not insertMany()
tourSchema.pre('save', function (next) {
  // this points to the currently processed document
  this.slug = slugify(this.name, { lower: true });
  next();
});

// 🔴 IMPLEMENTING EMBEDDING
/*
tourSchema.pre('save', async function (next) {
const guidesPromise = this.guides.map(async (id) => await User.findById(id)); // here the guidesPromise would be an array of promises returned by map since the fn inside the map is asynchrounous
this.guides = await Promise.all(guidesPromise); // awaiting all those promises parallely

// initially the guides array contained the id of all the users who were the guides to that tour (these ids were given at the time of the tour creation)
// finally after the map fn and awaiting the promises, the guides array would now contain the user documents themselves correponding to the IDs stored

next();
});
*/

// 🔴

// tourSchema.pre('save', function (next) {
//   console.log('will save document...');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// 🔴 QUERY MIDDLEWARE
// tourSchema.pre('find', function (next) { => this would not work for other find methods like findOne and others
tourSchema.pre(/^find/, function (next) {
  // /^find/ => works for all the methods that start with find
  // this will now point to the current query
  this.find({ secretTour: { $ne: true } });
  // we only want tour where the secretTour is not equal to true
  // this is a query object hence it has access to the find method
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt', // this would exclude these properties from the user document while displaying under guides
  });
  // this would now populate the guides feild in all of the queries
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`query took ${Date.now() - this.start} milliseconds`);
  next();
});

// 🔴 AGGREGATION MIDDLEWARE
/*
tourSchema.pre('aggregate', function (next) {
  // this points to the current aggregation object
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this.pipeline());
  next();
});
*/

// 🔴 CREATING A MODEL OUT OF THIS SCHEMA
const Tour = mongoose.model('Tour', tourSchema);
// model('tour name',schema used)

module.exports = Tour;
