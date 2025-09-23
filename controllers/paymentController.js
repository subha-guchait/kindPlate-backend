const { getPaymentStatus } = require("../services/cashfreeService");
const { Ad } = require("../models/adModel");
const Payment = require("../models/paymentModel");
const ErrorHandler = require("../utils/errorhandler");

exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    console.log("verify payment called");

    const paymentStatus = await getPaymentStatus(orderId);

    const payment = await Payment.findOneAndUpdate(
      { orderId: orderId },
      { status: paymentStatus },
      { new: true }
    );
    if (!payment) {
      return next(new ErrorHandler("Payment record not found", 404));
    }

    const ad = await Ad.findOneAndUpdate(
      { paymentId: payment._id },
      { paymentStatus: paymentStatus },
      { new: true }
    );

    if (!ad) {
      return next(new ErrorHandler("Ad record not found", 404));
    }

    res.status(200).json({ success: true, payment });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("verifing payment failed", 500));
  }
};
