const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/authMiddleware");

const {
  getProfile,
  updateProfile,
  leaderboard,
  pointHistory,
} = require("../controllers/userController");

router.get("/profile", authenticate, getProfile);
router.patch("/profile", authenticate, updateProfile);
router.get("/leaderboard", authenticate, leaderboard);
router.get("/point-history", authenticate, pointHistory);
router.get("/:userId", authenticate, getProfile);

module.exports = router;
