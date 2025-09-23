const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const pointHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post" }, // optional: linked to food post
    points: { type: Number, required: true }, // +10 credit, -10 debit
    transactionType: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    source: {
      type: String,
      enum: ["food_claim", "post_deleted"],
      required: true,
    },
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PointHistory", pointHistorySchema);
