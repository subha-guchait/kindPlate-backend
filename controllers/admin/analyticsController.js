const ErrorHandler = require("../../utils/errorhandler");
const User = require("../../models/userModel");
const Payment = require("../../models/paymentModel");
const { Ad } = require("../../models/adModel");
const { Post, ArchivePost } = require("../../models/postModel");

exports.summary = async (req, res, next) => {
  try {
    const userCount = await User.countDocuments();

    const totalApprovedAds = await Ad.countDocuments({ status: "approved" });

    //total payment where status = "Success"
    const totalSuccessPaymentAgg = await Payment.aggregate([
      { $match: { status: "Success" } },
      { $group: { _id: "$status", total: { $sum: "$amount" } } },
    ]);
    let totalPayments = 0;
    if (totalSuccessPaymentAgg.length > 0) {
      totalPayments = totalSuccessPaymentAgg[0].total;
    }

    // total food donated (from Post + ArchivePost where isClaimed = true)
    const activeAgg = await Post.aggregate([
      { $match: { isClaimed: true } },
      { $group: { _id: null, total: { $sum: "$servings" } } },
    ]);

    const archiveAgg = await ArchivePost.aggregate([
      { $match: { isClaimed: true } },
      { $group: { _id: null, total: { $sum: "$servings" } } },
    ]);

    const activeTotal = activeAgg.length > 0 ? activeAgg[0].total : 0;
    const archiveTotal = archiveAgg.length > 0 ? archiveAgg[0].total : 0;
    const totalFoodDonated = activeTotal + archiveTotal;

    const stats = {
      totalUsers: userCount,
      totalFoodDonated,
      totalPayments,
      totalApprovedAds,
    };

    res.status(200).json({ Success: true, stats });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("failed to get stats", 500));
  }
};

// Day & month maps
const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthMap = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

exports.revenueStats = async (req, res, next) => {
  try {
    const { period, month, year } = req.query;

    if (!period) return next(new ErrorHandler("Provide valid period", 400));

    let matchStage = { status: "Success" };
    let groupStage;
    let matchDate = {};

    switch (period) {
      case "daily": {
        if (!month || !year)
          return next(
            new ErrorHandler("Provide month and year for daily data", 400)
          );

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        matchDate = { createdAt: { $gte: startDate, $lte: endDate } };

        groupStage = {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            total: { $sum: "$amount" },
          },
        };
        break;
      }

      case "weekly": {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 6);
        matchDate = { createdAt: { $gte: lastWeek, $lte: today } };

        groupStage = {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            total: { $sum: "$amount" },
          },
        };
        break;
      }

      case "monthly": {
        if (!year)
          return next(new ErrorHandler("Provide year for monthly data", 400));

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        matchDate = { createdAt: { $gte: startDate, $lte: endDate } };

        groupStage = {
          $group: { _id: { $month: "$createdAt" }, total: { $sum: "$amount" } },
        };
        break;
      }

      case "yearly": {
        groupStage = {
          $group: { _id: { $year: "$createdAt" }, total: { $sum: "$amount" } },
        };
        break;
      }

      default:
        return next(new ErrorHandler("Invalid period", 400));
    }

    // Aggregate data
    const revenueData = await Payment.aggregate([
      { $match: { ...matchStage, ...matchDate } },
      groupStage,
      { $sort: { _id: 1 } },
    ]);

    // Fill zero values for missing periods
    let formatted = [];
    switch (period) {
      case "daily": {
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const found = revenueData.find((item) => item._id === d);
          formatted.push({
            name: `${d} ${monthMap[month - 1]}`,
            revenue: found ? found.total : 0,
          });
        }
        break;
      }

      case "weekly": {
        for (let i = 1; i <= 7; i++) {
          const found = revenueData.find((item) => item._id === i);
          formatted.push({
            name: dayMap[i - 1],
            revenue: found ? found.total : 0,
          });
        }
        break;
      }

      case "monthly": {
        for (let i = 1; i <= 12; i++) {
          const found = revenueData.find((item) => item._id === i);
          formatted.push({
            name: monthMap[i - 1],
            revenue: found ? found.total : 0,
          });
        }
        break;
      }

      case "yearly": {
        // Get years in the data, or last 5 years as default
        const years = revenueData.length
          ? revenueData.map((r) => r._id)
          : [
              new Date().getFullYear() - 4,
              new Date().getFullYear() - 3,
              new Date().getFullYear() - 2,
              new Date().getFullYear() - 1,
              new Date().getFullYear(),
            ];

        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);

        for (let y = minYear; y <= maxYear; y++) {
          const found = revenueData.find((item) => item._id === y);
          formatted.push({
            name: y.toString(),
            revenue: found ? found.total : 0,
          });
        }
        break;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Revenue data fetched successfully",
      data: formatted,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Server error", 500));
  }
};

exports.donationStats = async (req, res, next) => {
  try {
    const { period, month, year } = req.query;

    if (!period) return next(new ErrorHandler("Provide valid period", 400));

    let matchDate = {};
    let groupStage;

    switch (period) {
      case "daily": {
        if (!month || !year)
          return next(
            new ErrorHandler("Provide month and year for daily data", 400)
          );

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        matchDate = { createdAt: { $gte: startDate, $lte: endDate } };

        groupStage = {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            total: { $sum: "$servings" },
          },
        };
        break;
      }

      case "weekly": {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 6);
        matchDate = { createdAt: { $gte: lastWeek, $lte: today } };

        groupStage = {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            total: { $sum: "$servings" },
          },
        };
        break;
      }

      case "monthly": {
        if (!year)
          return next(new ErrorHandler("Provide year for monthly data", 400));

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        matchDate = { createdAt: { $gte: startDate, $lte: endDate } };

        groupStage = {
          $group: {
            _id: { $month: "$createdAt" },
            total: { $sum: "$servings" },
          },
        };
        break;
      }

      case "yearly": {
        groupStage = {
          $group: {
            _id: { $year: "$createdAt" },
            total: { $sum: "$servings" },
          },
        };
        break;
      }

      default:
        return next(new ErrorHandler("Invalid period", 400));
    }

    // Aggregate from both collections
    const aggregateData = async (Model) => {
      return Model.aggregate([
        { $match: { isClaimed: true, ...matchDate } },
        groupStage,
        { $sort: { _id: 1 } },
      ]);
    };

    const postData = await aggregateData(Post);
    const archiveData = await aggregateData(ArchivePost);

    // Merge data from posts + archivePosts
    const mergedMap = new Map();

    [...postData, ...archiveData].forEach((item) => {
      const key = item._id;
      if (mergedMap.has(key))
        mergedMap.set(key, mergedMap.get(key) + item.total);
      else mergedMap.set(key, item.total);
    });

    // Fill zero values for missing periods
    let formatted = [];
    switch (period) {
      case "daily": {
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          formatted.push({
            name: `${d} ${monthMap[month - 1]}`,
            donations: mergedMap.get(d) || 0,
          });
        }
        break;
      }

      case "weekly": {
        for (let i = 1; i <= 7; i++) {
          formatted.push({
            name: dayMap[i - 1],
            donations: mergedMap.get(i) || 0,
          });
        }
        break;
      }

      case "monthly": {
        for (let i = 1; i <= 12; i++) {
          formatted.push({
            name: monthMap[i - 1],
            donations: mergedMap.get(i) || 0,
          });
        }
        break;
      }

      case "yearly": {
        const years = mergedMap.size
          ? Array.from(mergedMap.keys())
          : [
              new Date().getFullYear() - 4,
              new Date().getFullYear() - 3,
              new Date().getFullYear() - 2,
              new Date().getFullYear() - 1,
              new Date().getFullYear(),
            ];
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);

        for (let y = minYear; y <= maxYear; y++) {
          formatted.push({
            name: y.toString(),
            donations: mergedMap.get(y) || 0,
          });
        }
        break;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Donations data fetched successfully",
      data: formatted,
    });
  } catch (err) {
    console.error(err);
    return next(new ErrorHandler("Server error", 500));
  }
};
