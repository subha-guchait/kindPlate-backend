const express = require("express");

const {
  uploadProfilePhoto,
  uploadPostMedia,
} = require("../controllers/mediaController");
const authenticate = require("../middlewares/authMiddleware");
const router = express.Router();

router.post("/upload/profile-photo", authenticate, uploadProfilePhoto);
router.post("/upload/post", authenticate, uploadPostMedia);

module.exports = router;
