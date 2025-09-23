const User = require("../models/userModel");
const mongoose = require("mongoose");
const ErrorHandler = require("../utils/errorhandler");
const { getProfile, updateProfile } = require("../services/userService");
const PointHistory = require("../models/pointHistoryModel");

exports.getProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let user;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return next(new ErrorHandler("Invalid user ID", 400));
      }
      user = await User.findById(userId).select(
        "-password -__v -tokenVersion -createdAt -updatedAt -isBlocked -isAccepted"
      );

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
    } else {
      user = req.user;
    }
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        points: user.points,
        userType: user.userType,
        imgUrl: user.imgUrl || null,
      },
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Unable to fetch user profile", 500));
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, imgUrl } = req.body;
    if (!name && !phone && !imgUrl) {
      return next(new ErrorHandler("provide atleast one field to update", 400));
    }

    if (
      name == req.user.name &&
      phone == req.user.phone &&
      imgUrl == req.user.imgUrl
    ) {
      return res.status(200).json({ sucess: true, message: "No changes made" });
    }

    await updateProfile(req.user.id, { name, phone, imgUrl });

    const profile = await getProfile(req.user.id);

    res.status(200).json({ sucess: true, user: profile });
  } catch (err) {
    console.log(err);
    return next(
      new ErrorHandler(err.message || "Unable to update profile", 500)
    );
  }
};

exports.leaderboard = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const leaderboard = await User.find()
      .sort({ points: -1, _id: 1 })
      .select("firstName lastName imgUrl points")
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await User.countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      leaderboard,
      totalcount: count,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      lastPage: totalPages,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Internal server error", 500));
  }
};

exports.pointHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const pointHistory = await PointHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await User.countDocuments();

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      totalPoint: req.user.points,
      pointHistory,
      totalcount: count,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      lastPage: totalPages,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to get point history", 500));
  }
};
