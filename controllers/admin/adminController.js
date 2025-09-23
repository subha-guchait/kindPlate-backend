const User = require("../../models/userModel");
const ErrorHandler = require("../../utils/errorhandler");

exports.getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: "admin" }).select(
      "-password -isAccepted -tokenVersion -createdAt -updatedAt -__v"
    );

    if (!admins) {
      return next(new ErrorHandler("No admin found", 404));
    }

    res.status(200).json({ success: true, admins });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to get admins", 500));
  }
};

exports.makeAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params; // or req.params, depending on your route

    if (!userId) {
      return next(new ErrorHandler("User ID is required", 400));
    }

    const user = await User.findById(userId).select(
      "-password -isAccepted -tokenVersion -createdAt -updatedAt -__v"
    );

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (user.role === "admin") {
      return next(new ErrorHandler("User is already an admin", 400));
    }

    user.role = "admin";
    await user.save();

    res.status(200).json({
      success: true,
      message: "User promoted to admin successfully",
      user,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to make user admin", 500));
  }
};

exports.removeAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params; // or req.params

    if (!userId) {
      return next(new ErrorHandler("User ID is required", 400));
    }

    const user = await User.findById(userId).select(
      "-password -isAccepted -tokenVersion -createdAt -updatedAt -__v"
    );

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (user.role !== "admin") {
      return next(new ErrorHandler("User is not an admin", 400));
    }

    user.role = "user"; // or "user", depending on your default role
    await user.save();

    res.status(200).json({
      success: true,
      message: "Admin rights removed successfully",
      user,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to remove admin", 500));
  }
};
