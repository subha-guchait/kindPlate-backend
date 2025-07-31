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
