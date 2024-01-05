class AppError extends Error {
  // Error is the in built error class
  constructor(message, statusCode) {
    super(message); // calling the Error constructor which receives only message; by doing this we have set the message property to the incoming message

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    // we are defining this class for all the operational errors so we have assigned this property to all these error which will be set to true, other errors like programming errors wont be having this property
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
