const ErrorHandler = require("../utils/errorhandler");
const generateRandomString = require("../utils/generateRandomString");
const Service = require("../models/serviceModel");
const { Ad, ArchiveAd } = require("../models/adModel");
const Payment = require("../models/paymentModel");
const {
  createorder,
  getPaymentStatus,
} = require("../services/cashfreeService");
const validateAndExtractS3Key = require("../utils/validateAndExtractS3Key");
const { deleteFromS3, getPublicUrl } = require("../services/awsService");

exports.createAd = async (req, res, next) => {
  try {
    const { content, mediaUrl, webUrl, duration } = req.body;
    if (!content || !mediaUrl || !duration) {
      return next(
        new ErrorHandler("content ,image and ads duration required", 400)
      );
    }

    let mediaKey = null;

    if (mediaUrl) {
      const { valid, key } = validateAndExtractS3Key(mediaUrl);
      if (!valid) {
        return next(new ErrorHandler("Invalid media URL", 400));
      }
      mediaKey = key;
    }

    const AdsPriceDetails = await Service.findOne({ name: "ads" });
    if (!AdsPriceDetails) {
      return next(new ErrorHandler("Advertisement price not found", 404));
    }

    const orderId = `OD-${generateRandomString()}`;
    const orderCurrency = "INR";
    const orderAmount = Number(AdsPriceDetails.price) * Number(duration);
    const customerName = req.user.firstName + " " + req.user.lastName;
    const customerID = req.user.id;
    const customerPhone = req.user.phone;
    const customerEmail = req.user.email;

    const paymentSessionId = await createorder(
      orderId,
      orderAmount,
      orderCurrency,
      customerID,
      customerPhone,
      customerName,
      customerEmail
    );

    if (!paymentSessionId) {
      return next(new ErrorHandler("Unable to create payment session", 500));
    }

    const paymentDetails = await Payment.create({
      orderId: orderId,
      paymentSessionId: paymentSessionId,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      amount: orderAmount,
      currency: orderCurrency,
      status: "Pending",
    });

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + duration * 24 * 60 * 60 * 1000
    );

    const adDetails = await Ad.create({
      content: content || "",
      mediaKey,
      webUrl: webUrl || "",
      duration,
      userId: req.user._id,
      paymentId: paymentDetails._id,
      startDate,
      endDate,
      lastResumedAt: startDate,
    });

    res.status(200).json({ sucess: true, paymentSessionId, orderId });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Unable to process", 500));
  }
};

exports.pauseAd = async (req, res, next) => {
  try {
    const { adId } = req.params;

    const ad = await Ad.findById(adId);
    if (!ad) return next(new ErrorHandler("Ad not found", 404));

    if (!canManageAd(req.user, ad)) {
      return next(new ErrorHandler("Not authorized", 403));
    }

    if (ad.status !== "live") {
      return next(new ErrorHandler("Only live ads can be paused", 400));
    }

    const now = new Date();

    if (ad.lastResumedAt) {
      // runtime in minutes
      const minutesRan = Math.floor((now - ad.lastResumedAt) / (1000 * 60));
      ad.totalRuntime = (ad.totalRuntime || 0) + minutesRan;
    }

    ad.status = "paused";
    await ad.save();

    return res.json({
      success: true,
      message: "Ad paused successfully",
      ad,
    });
  } catch (err) {
    console.log(err);
    next(new ErrorHandler("Failed to pause ad", 500));
  }
};

exports.resumeAd = async (req, res, next) => {
  try {
    const { adId } = req.params;

    const ad = await Ad.findById(adId);
    if (!ad) return next(new ErrorHandler("Ad not found", 404));

    if (!canManageAd(req.user, ad)) {
      return next(new ErrorHandler("Not authorized", 403));
    }

    if (ad.status !== "paused") {
      return next(new ErrorHandler("Only paused ads can be resumed", 400));
    }

    if (!ad.duration || isNaN(ad.duration)) {
      return next(new ErrorHandler("Invalid booked days", 400));
    }

    const totalRuntime = ad.totalRuntime || 0;
    const totalBookedMinutes = ad.duration * 24 * 60;
    const remainingMinutes = totalBookedMinutes - totalRuntime;

    if (remainingMinutes <= 0) {
      return next(new ErrorHandler("No remaining runtime left", 400));
    }

    ad.status = "live";
    ad.lastResumedAt = new Date();
    ad.endDate = new Date(Date.now() + remainingMinutes * 60 * 1000);

    await ad.save();

    return res.json({
      success: true,
      message: "Ad resumed successfully",
      ad,
    });
  } catch (err) {
    console.log("Resume Ad Error:", err);
    next(new ErrorHandler("Failed to resume ad", 500));
  }
};

exports.deleteAd = async (req, res, next) => {
  try {
    const { adId } = req.params;

    const ad = await Ad.findById(adId);
    if (!ad) return next(new ErrorHandler("Ad not found", 404));

    if (!canManageAd(req.user, ad)) {
      return next(new ErrorHandler("Not authorized", 403));
    }

    // archive before delete
    await ArchiveAd.create(ad.toObject());
    await ad.deleteOne();

    return res.json({ success: true, message: "Ad deleted successfully" });
  } catch (err) {
    next(new ErrorHandler("Failed to delete ad", 500));
  }
};

exports.getUserAds = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();

    // -------------------------
    // Step 1: Archive expired ads
    // -------------------------
    const expiredAds = await Ad.find({
      userId,
      $or: [
        { endDate: { $lt: now } },
        {
          $expr: { $gt: ["$totalRuntime", { $multiply: ["$duration", 1440] }] },
        },
      ],
    }).lean();

    if (expiredAds.length > 0) {
      const archivedDocs = expiredAds.map((ad) => ({
        ...ad,
        status: "expired",
      }));

      await ArchiveAd.insertMany(archivedDocs);

      const expiredIds = expiredAds.map((ad) => ad._id);
      await Ad.deleteMany({ _id: { $in: expiredIds } });
    }

    // -------------------------
    // Step 2: Fetch ads by status
    // -------------------------
    let ads = [];
    let count = 0;

    if (status === "live" || status === "paused") {
      const filter = { userId, status };
      ads = await Ad.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select("-__v")
        .lean();
      count = await Ad.countDocuments(filter);
    } else if (status === "expired") {
      const filterArchive = { userId, status: "expired" };
      ads = await ArchiveAd.find(filterArchive)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select("-__v")
        .lean();
      count = await ArchiveAd.countDocuments(filterArchive);
    } else {
      // default: all ads
      const filter = { userId };
      ads = await Ad.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .select("-__v")
        .lean();
      count = await Ad.countDocuments(filter);
    }

    const totalPages = Math.ceil(count / limit);

    // -------------------------
    // Step 3: Stats
    // -------------------------
    const [liveCount, pausedCount, expiredCount] = await Promise.all([
      Ad.countDocuments({ userId, status: "live" }),
      Ad.countDocuments({ userId, status: "paused" }),
      ArchiveAd.countDocuments({ userId, status: "expired" }),
    ]);

    // -------------------------
    // Step 4: Transform ads
    // -------------------------
    const adsWithUrl = ads.map((ad) => {
      let runtimeMinutes = ad.totalRuntime || 0;

      if (ad.status === "live" && ad.lastResumedAt) {
        runtimeMinutes += Math.floor(
          (now - new Date(ad.lastResumedAt)) / (1000 * 60)
        );
      }

      if (!ad.totalRuntime && ad.startDate) {
        runtimeMinutes = Math.floor(
          (now - new Date(ad.startDate)) / (1000 * 60)
        );
      }

      return {
        ...ad,
        mediaUrl: ad.mediaKey ? getPublicUrl(ad.mediaKey) : null,
        runtimeMinutes,
      };
    });

    // -------------------------
    // Step 5: Response
    // -------------------------
    res.status(200).json({
      success: true,
      ads: adsWithUrl,
      totalAds: count,
      currentPage: page,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      lastPage: totalPages,
      stats: {
        live: liveCount,
        paused: pausedCount,
        expired: expiredCount,
      },
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Failed to get ads", 500));
  }
};

exports.getRandomAd = async (req, res, next) => {
  try {
    const now = new Date();

    // Step 1: archive expired ads
    const expiredAds = await Ad.find({
      $or: [
        { endDate: { $lt: now } },
        {
          $expr: { $gt: ["$totalRuntime", { $multiply: ["$duration", 1440] }] },
        },
      ],
    }).lean();

    if (expiredAds.length > 0) {
      const archivedDocs = expiredAds.map((ad) => ({
        ...ad,
        status: "expired",
      }));

      await ArchiveAd.insertMany(archivedDocs);
      const expiredIds = expiredAds.map((ad) => ad._id);
      await Ad.deleteMany({ _id: { $in: expiredIds } });
    }

    // Step 2: fetch one random active ad
    const [ad] = await Ad.aggregate([
      {
        $match: {
          status: "live",
          paymentStatus: "Success",
          startDate: { $lte: now },
          endDate: { $gte: now },
          $expr: {
            $lte: ["$totalRuntime", { $multiply: ["$duration", 1440] }],
          },
        },
      },
      { $sample: { size: 1 } },
    ]);

    if (!ad) {
      return res
        .status(404)
        .json({ success: false, message: "No active ads available" });
    }

    return res.json({
      success: true,
      ad: {
        ...ad,
        mediaUrl: ad.mediaKey ? getPublicUrl(ad.mediaKey) : null,
        mediaKey: undefined, // hide raw key
      },
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Getting ads failed", 500));
  }
};

function canManageAd(user, ad) {
  if (!user) return false;
  if (user.role === "superAdmin") return true;
  if (user.role === "admin") return true;
  if (String(ad.userId) === String(user._id)) return true;

  return false;
}
