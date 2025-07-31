const express = require("express");

const validate = require("../middlewares/validate");
const userValidationSchema = require("../validations/userValidation");
const { register, login } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", validate(userValidationSchema), register);
router.post("/login", login);

module.exports = router;
