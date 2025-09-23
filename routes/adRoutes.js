const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/authMiddleware");

const {
  createAd,
  getRandomAd,
  pauseAd,
  resumeAd,
  getUserAds,
  deleteAd,
} = require("../controllers/adController");
const adValidationSchema = require("../validations/adValidationSchema");
const validate = require("../middlewares/validate");

router.post("/", authenticate, validate(adValidationSchema), createAd);
router.get("/random-ad", getRandomAd);
router.get("/", authenticate, getUserAds);
router.patch("/pause/:adId", authenticate, pauseAd);
router.patch("/resume/:adId", authenticate, resumeAd);
router.delete("/:adId", authenticate, deleteAd);

module.exports = router;
