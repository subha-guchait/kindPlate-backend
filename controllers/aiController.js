const { analyseImageService } = require("../services/aiService");

exports.analyseImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "imageUrl is required",
      });
    }

    const result = await analyseImageService(imageUrl);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI Controller Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to analyze image",
    });
  }
};
