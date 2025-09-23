const User = require("../../models/userModel");
const ErrorHandler = require("../../utils/errorhandler");
const mongoose = require("mongoose");

exports.queryUser = async (req, res, next) => {
  try {
    let { query } = req.query;
    console.log(query);
    if (!query) {
      return next(
        new ErrorHandler("Please Provide search email or mobile no", 400)
      );
    }
    query = query.trim(); // this will remove unwanted spaces in begining and ending

    const users = await User.find({
      $or: [{ email: query }, { phone: query }],
    }).select("-password -isAccepted -tokenVersion  -updatedAt -__v");

    if (!users) {
      return next(new ErrorHandler("No User found", 404));
    }

    res.status(200).json({ success: true, users });
  } catch (err) {
    return next(new ErrorHandler(err.message, 500));
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    // Exclude superAdmin
    const filter = { role: { $ne: "superAdmin" } };

    const users = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .select("-password -__v -tokenVersion");

    const count = await User.countDocuments(filter);

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      users,
      totalUsers: count,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      lastPage: totalPages,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to get users", 500));
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(new ErrorHandler("Invalid user ID", 400));
    }

    const user = await User.findById(userId).select(
      "-password -__v -tokenVersion"
    );

    if (!user) {
      return next(new ErrorHandler("User not found ", 404));
    }
    //prevenyting admin to block superAdmin
    if (
      (user.role == "superAdmin" || user.role == "admin") &&
      req.user.role == "admin"
    ) {
      return next(new ErrorHandler("Only SuperAdmin can do this", 403));
    }
    //for preventing self blocking
    if (user._id.toString() === req.user._id.toString()) {
      return next(new ErrorHandler("You cannot block yourself", 400));
    }

    if (user.isBlocked) {
      return res.status(200).json({
        success: true,
        message: "User is already blocked",
        user,
      });
    }

    user.isBlocked = true;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "User has been blocked", user });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("failed to block user Try again later", 500));
  }
};

exports.unBlockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(new ErrorHandler("Invalid user ID", 400));
    }

    const user = await User.findById(userId).select(
      "-password -__v -tokenVersion"
    );

    if (!user) {
      return next(new ErrorHandler("User not found ", 404));
    }

    if (
      (user.role === "superAdmin" || user.role === "admin") &&
      req.user.role === "admin"
    ) {
      return next(new ErrorHandler("Only SuperAdmin can do this", 403));
    }

    if (user._id.toString() === req.user._id.toString()) {
      return next(new ErrorHandler("You cannot unblock yourself", 400));
    }

    if (!user.isBlocked) {
      return res.status(200).json({
        success: true,
        message: "User is already Unblocked",
        user,
      });
    }

    user.isBlocked = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User has been Unblocked successfully",
      user,
    });
  } catch (err) {
    console.log(err);
    return next(
      new ErrorHandler("failed to unblock user Try again later", 500)
    );
  }
};
