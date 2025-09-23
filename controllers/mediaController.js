const { v4: uuidv4 } = require("uuid");

const { putObjectUrl } = require("../services/awsService");
const ErrorHandler = require("../utils/errorhandler");

exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return next(new ErrorHandler("Missing required fields", 400));
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      return next(new ErrorHandler("Only Images allowed", 400));
    }

    // Profile photo S3 path
    const key = generateUUIDBasedKey(req.user.id, "profile", contentType);
    const url = await putObjectUrl(key, contentType);

    res.status(200).json({ success: true, url });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ error: "Failed to get signed url for profile photo" });
  }
};

exports.uploadPostMedia = async (req, res) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      return next(new ErrorHandler("Missing required fields", 400));
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "video/mp4",
      "video/webm",
    ];

    if (!allowedTypes.includes(contentType)) {
      return next(new ErrorHandler("Invalid file type for post media", 400));
    }

    const key = generateUUIDBasedKey(req.user.id, "posts", contentType); //file name
    console.log(contentType);

    const url = await putObjectUrl(key, contentType);

    res.status(200).json({ success: true, url });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: "Failed to get signed url" });
  }
};

exports.uploadAdsMedia = async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return next(new ErrorHandler("Missing required fields", 400));
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      return next(new ErrorHandler("Only Images allowed", 400));
    }

    // Profile photo S3 path
    const key = generateUUIDBasedKey(req.user.id, "ads", contentType);
    const url = await putObjectUrl(key, contentType);

    res.status(200).json({ success: true, url });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to get signed url for Ads" });
  }
};

function generateUUIDBasedKey(userId, type, contentType) {
  const uuid = uuidv4();
  const extension = getExtensionFromContentType(contentType);
  return `users/${userId}/${type}/${uuid}${extension}`;
}

function getExtensionFromContentType(contentType) {
  const extensions = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
  };
  return extensions[contentType] || "";
}
