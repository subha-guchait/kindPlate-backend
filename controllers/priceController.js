const Service = require("../models/serviceModel");
const ErrorHandler = require("../utils/errorhandler");

exports.getPrice = async (req, res, next) => {
  try {
    let { name, day } = req.query;
    if (!name) {
      return next(new ErrorHandler("Service name not valid", 400));
    }

    day = day ? Number(day) : null;

    if (day !== null && isNaN(day)) {
      return next(new ErrorHandler("day should be valid number only", 400));
    }

    const priceDetails = await Service.findOne({ name });

    if (!priceDetails) {
      return next(new ErrorHandler("Service not found", 400));
    }
    let totalPrice;

    if (priceDetails.type == "time_based") {
      const durationDays = day || priceDetails.duration;
      totalPrice = priceDetails.price * durationDays;
    } else {
      totalPrice = priceDetails.price;
    }

    const price = {
      name: priceDetails.name,
      type: priceDetails.type,
      price: totalPrice,
      duration: priceDetails.duration || null,
    };

    res.status(200).json({ Success: true, price });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Calculating price failed", 500));
  }
};
