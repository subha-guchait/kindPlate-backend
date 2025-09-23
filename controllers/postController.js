const ErrorHandler = require("../utils/errorhandler");
const { Post, ArchivePost } = require("../models/postModel");
const User = require("../models/userModel");
const ClaimRequest = require("../models/claimRequestModel");
const Like = require("../models/likeModel");
const PointHistory = require("../models/pointHistoryModel");
const mongoose = require("mongoose");
const { deleteFromS3, getPublicUrl } = require("../services/awsService");
const validateAndExtractS3Key = require("../utils/validateAndExtractS3Key");

exports.createPost = async (req, res, next) => {
  try {
    let { mediaUrl, ...rest } = req.body;

    let mediaKey = null;

    if (mediaUrl) {
      const { valid, key } = validateAndExtractS3Key(mediaUrl);
      if (!valid) {
        return next(new ErrorHandler("Invalid media URL", 400));
      }
      mediaKey = key;
    }
    const post = new Post({
      ...rest,
      mediaUrl: mediaKey,
      postedBy: req.user._id,
    });
    const newPost = await post.save();

    res.status(201).json({
      success: true,
      message: "post created successfully",
      post: {
        ...newPost.toObject(),
        mediaUrl: mediaUrl || null,
      },
    });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

exports.deletePost = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { postId } = req.params;
    if (!postId) {
      return next(new ErrorHandler("Please provide a valid postId", 400));
    }

    let post = await Post.findById(postId).session(session);

    // If not found, check ArchivedPost collection
    if (!post) {
      post = await ArchivePost.findById(postId).session(session);
    }

    if (!post) {
      return next(new ErrorHandler("Post not found", 404));
    }

    if (post.postedBy.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You are not authorize to do this", 403));
    }

    await post.deleteOne({ session });

    if (post.mediaUrl) {
      await deleteFromS3(post.mediaUrl);
    }

    const previousPointDetails = await PointHistory.findOne({
      postId: post._id,
    });

    if (previousPointDetails) {
      await PointHistory.create(
        [
          {
            userId: post.postedBy,
            points: -previousPointDetails.points,
            transactionType: "debit",
            source: "post_deleted",
            description: `Food Post deleted`,
          },
        ],
        { session }
      );
      await User.findByIdAndUpdate(
        post.postedBy,
        {
          $inc: { points: -previousPointDetails.points },
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
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

    let posts = await Post.find(filter)
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

    posts = posts.map((post) => {
      return {
        ...post,
        likedByUser: likedPostIds.has(post._id.toString()),
        mediaUrl: post.mediaUrl ? getPublicUrl(post.mediaUrl) : null,
      };
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
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                imgUrl: 1,
                phone: 1,
              },
            },
          ],
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
    const transformedPosts = combinedPosts.map((post) => {
      return {
        ...post,
        likedByUser: likedPostIds.has(post._id.toString()),
        mediaUrl: post.mediaUrl ? getPublicUrl(post.mediaUrl) : null,
      };
    });

    res.status(200).json({
      success: true,
      posts: transformedPosts,
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

    //update point
    let point = calculatePoints(post.servings);
    await PointHistory.create({
      userId: req.user._id,
      postId: post._id,
      points: point,
      transactionType: "credit",
      source: "food_claim",
      description: `Donated ${post.servings} Qty food.`,
    });
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { points: point },
    });

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

function calculatePoints(servings) {
  servings = Number(servings);
  const maxPoint = 100;
  let point = 10;
  let extraPoint = 0;
  if (servings > 10) {
    extraPoint = Math.ceil((servings - 10) / 10) * 5;
  }

  point += extraPoint;
  return Math.min(point, maxPoint);
}

// Validate AWS media URL
function isValidS3Url(mediaUrl) {
  try {
    const parsed = new URL(mediaUrl);
    const expectedHost = `${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`;
    return parsed.hostname === expectedHost;
  } catch (err) {
    return false;
  }
}

// notes
// parsed = new URL(mediaUrl);

// here we get structured parts

// parsed.protocol → "https:"

// parsed.hostname → "my-bucket.s3.ap-south-1.amazonaws.com" ✅

// parsed.pathname → "/uploads/file.png"

// parsed.search → "?X-Amz-..." (if it’s a signed URL)

// parsed.href → full URL
