const express = require("express");
const authenticate = require("../middlewares/authMiddleware");

const { analyseImage } = require("../controllers/aiController");
const {
  helpAssistant,
  getChatHistory,
} = require("../controllers/aiController");

const router = express.Router();

router.post("/check-image", authenticate, analyseImage);
router.post("/help", authenticate, helpAssistant);
router.get("/help/history", authenticate, getChatHistory);

module.exports = router;
