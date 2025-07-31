const express = require("express");

const router = express.Router();

const authenticate = require("../middlewares/authMiddleware");
const {
  createPost,
  deletePost,
  getPosts,
  userPosts,
  likeUnlikePost,
  updateClaimed,
} = require("../controllers/postController");
const postValidationSchema = require("../validations/postValidation");
const validate = require("../middlewares/validate");

router.post("/", authenticate, validate(postValidationSchema), createPost);
router.delete("/:postId", authenticate, deletePost);
router.get("/", authenticate, getPosts);
router.get("/user/:userId", authenticate, userPosts);
router.get("/user", authenticate, userPosts);
router.post("/like/:postId", authenticate, likeUnlikePost);
router.patch("/claimed/:postId", authenticate, updateClaimed);

module.exports = router;
