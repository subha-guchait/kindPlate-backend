const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentSessionId: {
      type: String,
      unique: true,
    },
    customerName: {
      type: String,
    },
    customerEmail: {
      type: String,
    },
    customerPhone: {
      type: String,
    },
    amount: {
      type: Number,
      allowNull: false,
    },
    currency: {
      type: String,
    },
    status: {
      type: String,
      eNUM: ("Pending", "Success", "Failed"),
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
