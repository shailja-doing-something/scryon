import { GoogleGenerativeAI } from "@google/generative-ai";

function getModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
}

export async function generateContent(prompt: string): Promise<string> {
  const model = getModel();
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      attempts++;
      if (attempts === 3) throw error;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Gemini failed after 3 attempts");
}
