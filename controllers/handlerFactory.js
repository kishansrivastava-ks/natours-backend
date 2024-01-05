// the goal is to create a fn that would return a fn that is able to perform the delete action not only for one particular route but common to everyone

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// we would pass in the model to this fn and that would return the delete handler fn
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // 204 means no content since we're not sending any data back

    const doc = await Model.findByIdAndDelete(req.params.id);

    // in a restful api we dont send any data to the client upon deletion

    if (!doc) {
      return next(new AppError('No document Found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // quering for the document we want to update
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    //this would replace the fiels that are there in the body with the updated values

    if (!doc) {
      return next(new AppError('No document Found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id); // getting the query

    if (popOptions) query = query.populate(popOptions); // populate the query if the populate options exists

    const doc = await query;

    // const doc = await Model.findById(req.params.id).populate('reviews');

    if (!doc) {
      return next(new AppError('No document Found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on Tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const doc = await features.query.explain(); // this would give the stats of the query response
    const doc = await features.query;

    // 🔴 SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
