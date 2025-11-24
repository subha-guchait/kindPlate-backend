const { analyseImageService } = require("../services/aiService");
const ErrorHandler = require("../utils/errorhandler");
const helpService = require("../services/helpAiService");
const HelpChatHistory = require("../models/helpChatHistoryModel");

exports.analyseImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return next(new ErrorHandler("imageUrl is required", 400));
    }

    const result = await analyseImageService(imageUrl);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("AI Controller Error:", error.message);

    return next(new ErrorHandler("Failed to analyze image", 500));
  }
};

exports.helpAssistant = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return next(new ErrorHandler("Message is required.", 400));
    }
    //saving user msg in db
    await helpService.appendToHistory(userId, "user", message);

    // get ai response
    const aiText = await helpService.getChatResponse(userId, message);

    //saving ai msg in db
    await helpService.appendToHistory(userId, "model", aiText);

    return res.json({ success: true, reply: aiText });
  } catch (err) {
    console.error("Chatbot Error:", err);

    return next(
      new ErrorHandler(
        "I'm having trouble connecting to the server. Please try again later.",
        500
      )
    );
  }
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const doc = await HelpChatHistory.findOne({ userId })
      .select("messages")
      .lean();

    return res.json({
      success: true,
      history: doc?.messages || [],
    });
  } catch (err) {
    console.error("History Load Error:", err);
    return next(new ErrorHandler("Failed to load history.", 500));
  }
};
