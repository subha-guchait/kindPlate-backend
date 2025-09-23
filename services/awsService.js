const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.putObjectUrl = async (key, contentType) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key, //file name
      ContentType: contentType,
    };

    const command = new PutObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (err) {
    console.log("error in putObjectUrl: ", err);
    throw new Error("Failed to get sigend url");
  }
};

exports.deleteFromS3 = async (key) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log(`Deleted from S3: ${key}`);
  } catch (err) {
    console.error("Error deleting from S3:", err);
    throw new Error("Failed to delete media from s3");
  }
};

exports.uploadToS3 = async (fileBuffer, key, contentType) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    return this.getPublicUrl(key);
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw new Error("Failed to upload file to S3");
  }
};

exports.getPublicUrl = (key) => {
  return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
