const ErrorHandler = require("../utils/errorhandler");
const { Post } = require("../models/postModel");
const ClaimRequest = require("../models/claimRequestModel");
const Like = require("../models/likeModel");
const mongoose = require("mongoose");

exports.createPost = async (req, res, next) => {
  try {
    const post = new Post({ ...req.body, postedBy: req.user._id });
    const newPost = await post.save();

    res.status(201).json({
      success: true,
      message: "post created successfully",
      post: newPost,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return next(new ErrorHandler("Please provide a valid postId", 400));
    }

    const post = await Post.findById(postId);

    if (post.postedBy.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You are not authorize to do this", 403));
    }

    await post.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

exports.getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const userId = req.user._id;

    const filter = {
      isClaimed: false,
      expiryTime: { $gt: Date.now() },
    };

    if (req.query.city) {
      filter["location.city"] = req.query.city;
    }

    if (req.query.state) {
      filter["location.state"] = req.query.state;
    }

    const posts = await Post.find(filter)
      .populate("postedBy", "firstName lastName imgUrl phone")
      .sort({ expiry: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await Post.countDocuments(filter);

    const totalPages = Math.ceil(count / limit);

    //to get likes of the user on the posts
    const postIds = posts.map((p) => p._id);
    const userLikes = await Like.find({
      postId: { $in: postIds },
      userId,
    }).select("postId");

    const likedPostIds = new Set(
      userLikes.map((like) => like.postId.toString())
    );

    posts.forEach((post) => {
      post.likedByUser = likedPostIds.has(post._id.toString());
    });

    res.status(200).json({
      success: true,
      posts,
      totalPost: count,
      hasPreviousPage: page > 1,
      hasNextpage: page < totalPages,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      lastPage: totalPages,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to fetch posts", 500));
  }
};

exports.userPosts = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const combinedPosts = await Post.aggregate([
      { $match: { postedBy: userObjectId } },

      {
        $unionWith: {
          coll: "archiveposts",
          pipeline: [{ $match: { postedBy: userObjectId } }],
        },
      },

      // ✅ Join with users collection
      {
        $lookup: {
          from: "users",
          localField: "postedBy",
          foreignField: "_id",
          as: "postedBy",
        },
      },
      { $unwind: "$postedBy" }, // flatten array

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Count totals (parallel execution)
    const [postCount, archiveCount] = await Promise.all([
      Post.countDocuments({ postedBy: userId }),
      mongoose.model("ArchivePost").countDocuments({ postedBy: userId }),
    ]);
    const totalCount = postCount + archiveCount;
    const totalPages = Math.ceil(totalCount / limit);

    // Likes check
    const viewerId = req.user?._id;

    const postIds = combinedPosts.map((p) => p._id);
    const userLikes = await Like.find({
      postId: { $in: postIds },
      userId: viewerId,
    }).select("postId");

    const likedPostIds = new Set(
      userLikes.map((like) => like.postId.toString())
    );
    combinedPosts.forEach((post) => {
      post.likedByUser = likedPostIds.has(post._id.toString());
    });

    res.status(200).json({
      success: true,
      posts: combinedPosts,
      totalPost: totalCount,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      lastPage: totalPages,
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to fetch posts", 500));
  }
};

// exports.requestClaim = async (req, res, next) => {
//   try {
//     const { postId } = req.params;

//     if (!postId) {
//       return next(new ErrorHandler("postId required", 400));
//     }

//     const post = await Post.findById(postId);

//     if (!post) {
//       return next(new ErrorHandler("post not found", 404));
//     }

//     if (post.isClaimed) {
//       return next(new ErrorHandler("post already claimed", 401));
//     }

//     if (post.postedBy.toString() === req.user._id.toString()) {
//       return next(new ErrorHandler("You can't claim your own post", 403));
//     }

//     const alreadyRequested = await ClaimRequest.exists({
//       requestedBy: req.user._id,
//       postId: postId,
//     });

//     if (alreadyRequested) {
//       return next(new ErrorHandler("You already requested for claim", 400));
//     }

//     await ClaimRequest.create({
//       requestedBy: req.user._id,
//       status: "pending",
//       postId: postId,
//     });

//     res.status(201).json({ success: true, message: "Successfully requested" });
//   } catch (err) {
//     console.log(err);
//     return next(new ErrorHandler("Something went wrong", 500));
//   }
// };

// exports.claimRequests = async (req, res, next) => {
//   try {
//     const { postId } = req.params;

//     if (!postId) {
//       return next(new ErrorHandler("postId required", 400));
//     }

//     const post = await Post.findById(postId);

//     if (!post) {
//       return next(new ErrorHandler("post not found", 404));
//     }

//     if (post.postedBy.toString() !== req.user._id.toString()) {
//       return next(new ErrorHandler("Post doesn't belongs to you", 403));
//     }

//     const claimRequests = await ClaimRequest.find({ postId }).populate(
//       "requestedBy",
//       "firstName lastName imgUrl userType"
//     );

//     res.status(200).json({ success: true, claimRequests });
//   } catch (err) {
//     console.log(err);
//     return next(new ErrorHandler("fetching claim requests failed", 500));
//   }
// };

// exports.updateClaimStatus = async (req, res, next) => {
//   try {
//     const { claimId, action } = req.params;

//     const validActions = ["accept", "reject"];
//     if (!validActions.includes(action)) {
//       return next(
//         new ErrorHandler("Invalid action. Must be 'accept' or 'reject'", 400)
//       );
//     }

//     const claim = await ClaimRequest.findById(claimId).populate("postId");

//     if (!claim) {
//       return next(new ErrorHandler("Claim request not found", 404));
//     }

//     const post = claim.postId;

//     if (post.postedBy.toString() !== req.user._id.toString()) {
//       return next(
//         new ErrorHandler("You are not authorized to modify this claim", 403)
//       );
//     }

//     if (post.isClaimed && action === "accept") {
//       return next(new ErrorHandler("This post is already claimed", 400));
//     }

//     claim.status = action;
//     await claim.save();

//     if (action === "accept") {
//       post.isClaimed = true;
//       await post.save();

//       await ClaimRequest.updateMany(
//         {
//           postId: post._id,
//           _id: { $ne: claim._id }, // other claim req except this one
//           status: "pending",
//         },
//         { $set: { status: "rejected" } }
//       );
//     }

//     const updatedRequests = await ClaimRequest.find({
//       postId: post._id,
//     }).populate("requestedBy", "firstName lastName imgUrl userType");

//     res.status(200).json({
//       success: true,
//       message: "Claim request updated",
//       claimRequests: updatedRequests,
//     });
//   } catch (err) {
//     console.log(err);
//     return next(new ErrorHandler("Failed to update claim status", 500));
//   }
// };

exports.updateClaimed = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return next(new ErrorHandler("PostId is required", 400));
    }
    const post = await Post.findById(postId);
    if (!post) {
      return next(new ErrorHandler("Post not found", 404));
    }

    if (post.postedBy.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler("You are not authorized to update this post", 403)
      );
    }

    if (post.isClaimed) {
      return next(new ErrorHandler("Post already marked as claimed", 400));
    }

    post.isClaimed = true;
    await post.save();
    res
      .status(200)
      .json({ success: true, message: "Post marked as claimed", post });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to mark post as claimed", 500));
  }
};

exports.likeUnlikePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return next(new ErrorHandler("PostId is required", 400));
    }

    const post = await Post.findById(postId);

    if (!post) {
      return next(new ErrorHandler("Post not found", 404));
    }

    const likedByUser = await Like.findOne({ postId, userId: req.user._id });

    if (likedByUser) {
      await likedByUser.deleteOne();
      post.likeCount -= 1;
      await post.save();
      const plainPost = post.toObject();
      plainPost.likedByUser = false;
      return res.status(200).json({
        success: true,
        message: "post unliked successfully",
        post: plainPost,
      });
    } else {
      await Like.create({ postId, userId: req.user._id });
      post.likeCount += 1;
      await post.save();
      const plainPost = post.toObject();
      plainPost.likedByUser = true;
      return res.status(200).json({
        success: true,
        message: "post liked successfully",
        post: plainPost,
      });
    }
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to like/unlike post", 500));
  }
};
