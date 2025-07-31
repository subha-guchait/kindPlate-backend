const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const claimRequestSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    postId: { type: Schema.Types.ObjectId, ref: "FoodPost", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClaimRequest", claimRequestSchema);
