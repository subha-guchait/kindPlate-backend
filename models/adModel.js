const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const adSchema = new Schema(
  {
    content: {
      type: String,
    },
    mediaKey: {
      type: String,
    },
    webUrl: {
      type: String,
    },
    duration: {
      type: Number,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    paymentStatus: {
      type: String,
      eNUM: ("Pending", "Success", "Failed"),
      default: "Pending",
    },
    status: {
      type: String,
      enum: ["live", "paused", "expired"],
      default: "live",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalRuntime: { type: Number, default: 0 },
    lastResumedAt: { type: Date },
  },
  { timestamps: true }
);

const Ad = mongoose.model("Ad", adSchema);

const ArchiveAd = mongoose.model("ArchiveAd", adSchema);

module.exports = { Ad, ArchiveAd };
