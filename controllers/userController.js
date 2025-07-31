const User = require("../models/userModel");
const ErrorHandler = require("../utils/errorhandler");
const { getProfile, updateProfile } = require("../services/userService");

exports.getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        userType: req.user.userType,
        imgUrl: req.user.imgUrl || null,
      },
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Unable to fetch user profile", 500));
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    if (!name && !phone) {
      return next(new ErrorHandler("provide atleast one field to update", 400));
    }

    if (name == req.user.name && phone == req.user.phone) {
      return res.status(200).json({ sucess: true, message: "No changes made" });
    }

    await updateProfile(req.user.id, { name, phone });

    const profile = await getProfile(req.user.id);

    res.status(200).json({ sucess: true, user: profile });
  } catch (err) {
    console.log(err);
    return next(
      new ErrorHandler(err.message || "Unable to update profile", 500)
    );
  }
};
