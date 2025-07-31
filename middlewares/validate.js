const ErrorHandler = require("../utils/errorhandler");

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return next(new ErrorHandler(error.details[0].message, 400));
  }

  req.body = value;
  next();
};

module.exports = validate;
