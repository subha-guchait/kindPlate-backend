const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/authMiddleware");

const { getProfile, updateProfile } = require("../controllers/userController");

router.get("/profile", authenticate, getProfile);
router.patch("/profile", authenticate, updateProfile);

module.exports = router;
