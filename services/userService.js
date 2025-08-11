const User = require("../models/userModel");

const getProfile = async (userId) => {
  try {
    return await User.findById(userId)
      .select("-password -__v -tokenVersion -isBlocked -isAccepted -role")
      .lean();
  } catch (err) {
    throw new Error("unable to fetch profile");
  }
};

const updateProfile = async (userId, updatedData) => {
  try {
    const { name, phone, imgUrl } = updatedData;

    const user = await User.findById(userId);
    const existingPhone = await User.findOne({ phone });

    if (existingPhone && existingPhone._id.toString() !== userId) {
      throw new Error("Phone number already exists");
    }

    user.name = name;
    user.phone = phone;
    user.imgUrl = imgUrl;

    return await user.save();
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
};

module.exports = { getProfile, updateProfile };
