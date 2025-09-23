const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/authMiddleware");

const { getPrice } = require("../controllers/priceController");

router.get("/calculate", authenticate, getPrice);

module.exports = router;
