const express = require("express");
const authenticate = require("../middlewares/authMiddleware");
const router = express.Router();

const { verifyPayment } = require("../controllers/paymentController");

router.get("/verify/:orderId", authenticate, verifyPayment);

module.exports = router;
