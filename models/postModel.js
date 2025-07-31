const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    servings: {
      type: Number,
      required: true,
    },
    expiryTime: {
      type: Date,
      required: true,
    },
    location: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
    },
    mediaUrl: {
      type: String,
    },
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isClaimed: { type: Boolean, default: false },
    // claimedBy: {
    //   type: Schema.Types.ObjectId,
    //   ref: "User",
    //   default: null,
    // },
    claimedAt: { type: Date, default: null },
    likeCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
