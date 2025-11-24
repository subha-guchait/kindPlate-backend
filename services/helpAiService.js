const { GoogleGenerativeAI } = require("@google/generative-ai");
const HelpChatHistory = require("../models/helpChatHistoryModel");
const User = require("../models/userModel");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

//static knowledge
const systemInstruction = `
ROLE:
You are the "KindPlate Assistant", a helpful and strict AI support agent for the KindPlate food donation platform.

---
1. ABOUT KINDPLATE (VISION)
- Mission: Bridge the gap between excess food and empty plates. Stop food waste; fight local hunger.
- Cost: Free for donations. Paid features available for Ads.

---
2. HOW-TO GUIDES (UI INSTRUCTIONS)
- Create a Post: Go to the "Posts" screen > Click the "+" (Create Post) button > Upload food image > Add title and address > Click Post.
- Contact Donor: Click the "Phone Icon" 📞 at the bottom of the specific post to reveal their contact number.
- Create an Ad: Go to "Ads Page" > Click "Create Ad" > Input ad content, image, website URL, and duration > Pay to submit. Your ad goes live after payment.
- Manage Ads: Go to "Manage Ads" page > View your active ads > You can Pause ⏸️ or Delete 🗑️ ads here.
- Reporting: Users can report suspicious posts. Admins review these reports.

---
3. POINTS SYSTEM (GAMIFICATION)
- Base Reward: Every successful donation post gets a guaranteed +10 points.
- Extra Points: If the donation serves more than 10 people, you get +5 extra points for every additional 10 servings (or part thereof).
  - Formula: Base(10) + (Ceil((Servings - 10)/10) * 5)
  - Cap: Max 100 points per post.
- Examples: 
  - 5 servings = 10 pts.
  - 12 servings = 15 pts.
  - 30 servings = 20 pts.
  - 200 servings = 100 pts.

---
4. SAFETY & RESTRICTIONS
- Valid Donations: Cooked meals, raw ingredients, packaged food.
- Banned Items: Expired food, leftovers from a used plate (hygiene risk), alcohol.
- AI Validation: We use AI to screen images for blurriness, but recipients must always inspect food before eating.
- Do NOT provide medical or legal advice.
- If unsure, refer them to support@kindplate.com.
`;

async function fetchUserContext(userId) {
  const user = await User.findById(userId)
    .select("firstName lastName points role createdAt ")
    .lean();
  if (!user) return null;

  //   const totalPosts = await Post.countDocuments({ userId });
  return `
    USER CONTEXT:
    - Name: ${user.firstName + " " + user.lastName}
    - Role: ${user.role}
    - Points: ${user.points || 0}
    - createdAt : ${user.createdAt}
  `;
}

// 3. Load & Format History for Gemini SDK
async function loadFormattedHistory(userId) {
  const doc = await HelpChatHistory.findOne({ userId }).lean();
  if (!doc || !doc.messages) return [];

  return doc.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));
}

// 4. Save Message (Auto-Trim to last 30)
async function appendToHistory(userId, role, text) {
  await HelpChatHistory.findOneAndUpdate(
    { userId },
    {
      $push: {
        messages: {
          $each: [{ role, text, timestamp: new Date() }], // Add new msg
          $slice: -30, // Keep only the last 30 items
        },
      },
    },
    { new: true, upsert: true }
  );
}

async function getChatResponse(userId, userMessage) {
  const userContextStr = await fetchUserContext(userId);
  const history = await loadFormattedHistory(userId);

  // combine all instruction + user data
  const finalSystemInstruction = `
    ${systemInstruction}

    ${userContextStr}

    STRICT RULES:
    - Answer ONLY based on the App Knowledge and User Context provided.
    - If the user asks about general topics (coding, weather, politics), politely refuse.
    - Keep answers short (max 3 sentences).
    - If unsure, say: "I'm not sure. Please contact support@kindplate.com."
  `;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: finalSystemInstruction,
  });

  // Start Chat Session with DB History
  const chat = model.startChat({
    history: history,
    generationConfig: {
      maxOutputTokens: 200, // to prevent long output
    },
  });

  // Send new message
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

module.exports = {
  appendToHistory,
  getChatResponse,
};
