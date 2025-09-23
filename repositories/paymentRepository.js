import Payment from "../models/Payment.js";

const fetchRevenue = async (period, month, year) => {
  const matchStage = { status: "success" };
  let matchDate = {};
  let groupStage;

  switch (period) {
    case "daily":
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

    case "weekly":
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

    case "monthly":
      const startMonth = new Date(year, 0, 1);
      const endMonth = new Date(year, 11, 31, 23, 59, 59);
      matchDate = { createdAt: { $gte: startMonth, $lte: endMonth } };
      groupStage = {
        $group: { _id: { $month: "$createdAt" }, total: { $sum: "$amount" } },
      };
      break;

    case "yearly":
      groupStage = {
        $group: { _id: { $year: "$createdAt" }, total: { $sum: "$amount" } },
      };
      break;

    default:
      throw new Error("Invalid period");
  }

  const data = await Payment.aggregate([
    { $match: { ...matchStage, ...matchDate } },
    groupStage,
    { $sort: { _id: 1 } },
  ]);

  return data; // raw aggregation data
};

export default { fetchRevenue };
