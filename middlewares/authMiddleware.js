const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const ErrorHandler = require("../utils/errorhandler");

const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization");
    if (!token) {
      return next(new ErrorHandler("Authorization token missing", 401));
    }
    const user = jwt.verify(token, process.env.JWT_SECRET);

    if (!user) {
      return next(new ErrorHandler("Invalid or expired token", 401));
    }
    console.log(user);
    const userDetails = await User.findById(user.id);
    console.log(userDetails);

    if (!userDetails) {
      return next(new ErrorHandler("User not found", 401));
    }

    if (user.tokenVersion !== userDetails.tokenVersion) {
      return next(new ErrorHandler("Jwt Expired", 401));
    }

    if (user.isBlocked) {
      return next(
        new ErrorHandler(
          "Your account has been blocked please contact support",
          403
        )
      );
    }

    req.user = userDetails;
    next();
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("something went wrong", 500));
  }
};

module.exports = authenticate;
