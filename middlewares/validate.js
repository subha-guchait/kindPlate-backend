const ErrorHandler = require("../utils/errorhandler");

const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const data = req[source]; // source can be "body", "query", or "params"
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return next(new ErrorHandler(error.details[0].message, 400));
    }

    // replace the source with validated value
    req[source] = value;
    next();
  };

module.exports = validate;
