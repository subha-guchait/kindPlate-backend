const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    imgUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superAdmin"],
      default: "user",
    },
    points: { type: Number, default: 0 },
    userType: {
      type: String,
      enum: [
        "individual",
        "ngo",
        "oldage",
        "orphanage",
        "shelter",
        "communityKitchen",
      ],
      default: "individual",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isAccepted: {
      type: Boolean,
      required: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
