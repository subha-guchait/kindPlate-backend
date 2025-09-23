const express = require("express");
const {
  getAdmins,
  makeAdmin,
  removeAdmin,
} = require("../../controllers/admin/adminController");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");
const authenticate = require("../../middlewares/authMiddleware");

const router = express.Router();

// Only superAdmin can manage admins
router.get("/", authenticate, authorizeRoles("superAdmin"), getAdmins);
router.post(
  "/make-admin/:userId",
  authenticate,
  authorizeRoles("superAdmin"),
  makeAdmin
);
router.post(
  "/remove-admin/:userId",
  authenticate,
  authorizeRoles("superAdmin"),
  removeAdmin
);

module.exports = router;
