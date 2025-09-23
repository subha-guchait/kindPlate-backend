const express = require("express");

const router = express.Router();

const {
  summary,
  revenueStats,
  donationStats,
} = require("../../controllers/admin/analyticsController");
const authenticate = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");

router.get(
  "/summary",
  authenticate,
  authorizeRoles("admin", "superAdmin"),
  summary
);
router.get(
  "/revenue",
  authenticate,
  authorizeRoles("admin", "superAdmin"),
  revenueStats
);
router.get(
  "/donation",
  authenticate,
  authorizeRoles("admin", "superAdmin"),
  donationStats
);

module.exports = router;
