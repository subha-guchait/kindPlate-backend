const express = require("express");

const router = express.Router();

const validate = require("../../middlewares/validate");
const searchUserValidationSchema = require("../../validations/searchUserValidation");
const authenticate = require("../../middlewares/authMiddleware");
const {
  queryUser,
  getUsers,
  blockUser,
  unBlockUser,
} = require("../../controllers/admin/userController");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");

router.get(
  "/search",
  authenticate,
  authorizeRoles("admin", "superAdmin"),
  validate(searchUserValidationSchema, "query"),
  queryUser
);
router.get("/", authenticate, authorizeRoles("admin", "superAdmin"), getUsers);
router.patch(
  "/block/:userId",
  authenticate,
  authorizeRoles("admin", "superAdmin"),
  blockUser
);
router.patch(
  "/unblock/:userId",
  authenticate,
  authorizeRoles("admin", "superAdmin"),
  unBlockUser
);

module.exports = router;
