// middleware/authorizeRoles.js
const ErrorHandler = require("../utils/errorhandler");

/**
 * Middleware factory to authorize specific roles
 * @param  {...string} roles - Allowed roles
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler("User not found", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Only ${roles.join(" or ")} can perform this action`,
          403
        )
      );
    }

    next();
  };
};
