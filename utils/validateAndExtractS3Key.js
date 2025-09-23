function validateAndExtractS3Key(mediaUrl) {
  try {
    const parsed = new URL(mediaUrl);
    const expectedHost = `${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`;

    if (parsed.hostname !== expectedHost) {
      return { valid: false, key: null };
    }

    // remove leading slash from pathname
    const key = parsed.pathname.startsWith("/")
      ? parsed.pathname.slice(1)
      : parsed.pathname;

    return { valid: true, key };
  } catch (err) {
    return { valid: false, key: null };
  }
}

module.exports = validateAndExtractS3Key;
