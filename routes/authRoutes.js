const express = require("express");

const validate = require("../middlewares/validate");
const userValidationSchema = require("../validations/userValidation");
const changePasswordValidation = require("../validations/changePasswordValidation");
const {
  register,
  login,
  changePassword,
} = require("../controllers/authController");
const authenticate = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/signup", validate(userValidationSchema), register);
router.post("/login", login);
router.patch(
  "/change-password",
  authenticate,
  validate(changePasswordValidation),
  changePassword
);

module.exports = router;
