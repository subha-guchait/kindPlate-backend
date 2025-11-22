const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const sharp = require("sharp");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isFood: { type: SchemaType.BOOLEAN },
    isBlurry: { type: SchemaType.BOOLEAN },
    clarityScore: { type: SchemaType.NUMBER },
    confidence: { type: SchemaType.NUMBER },
    reason: { type: SchemaType.STRING },
  },
  required: ["isFood", "isBlurry", "clarityScore", "confidence", "reason"],
};

async function optimizedImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const originalBuffer = Buffer.from(arrayBuffer);

  const optimizedBuffer = await sharp(originalBuffer)
    .rotate()
    .resize({ width: 800 })
    .jpeg({ quality: 60 })
    .toBuffer();

  return {
    inlineData: {
      data: optimizedBuffer.toString("base64"),
      mimeType: "image/jpeg",
    },
  };
}

async function analyseImageService(imageUrl) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const imagePart = await optimizedImage(imageUrl);

    const prompt = `
      Analyze this image for a leftover food donation platform.
      Check if:
      - It is food
      - It is blurry
      - Clarity score from 0-10
      - Confidence 0-1
      Return ONLY JSON with no extra text.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("AI Service Error:", error);

    return {
      isFood: false,
      isBlurry: false,
      clarityScore: 0,
      confidence: 0,
      reason: "AI service unavailable",
    };
  }
}

module.exports = { analyseImageService };
