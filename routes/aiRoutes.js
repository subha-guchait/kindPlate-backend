const express = require("express");
const authenticate = require("../middlewares/authMiddleware");

const { analyseImage } = require("../controllers/aiController");

const router = express.Router();

router.post("/check-image", authenticate, analyseImage);

module.exports = router;
