const cron = require("node-cron");
const mongoose = require("mongoose");

const { Post, ArchivePost } = require("../models/postModel");

const archiveClaimedAndExpiredPosts = async () => {
  console.log("Starting archive job...");
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const currentDate = new Date();

    const postsToArchive = await Post.find({
      $or: [{ isClaimed: true }, { expiryTime: { $lt: currentDate } }],
    });

    if (!postsToArchive.length) {
      console.log("No claimed & expired posts to archive.");
      await session.commitTransaction();
      session.endSession();
      return;
    }

    await ArchivePost.insertMany(
      postsToArchive.map((p) => p.toObject()),
      { session }
    );

    await Post.deleteMany(
      { _id: { $in: postsToArchive.map((p) => p._id) } },
      { session }
    );
    await session.commitTransaction();
    console.log("Archive job committed successfully");
  } catch (err) {
    console.error("Archive job failed ", err);
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
};

cron.schedule("0 1 * * *", archiveClaimedAndExpiredPosts, {
  timezone: "Asia/Kolkata",
});

module.exports = archiveClaimedAndExpiredPosts;
