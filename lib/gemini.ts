import { GoogleGenerativeAI } from "@google/generative-ai";

function getModel(systemInstruction?: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction });
}

export async function generateContent(prompt: string): Promise<string> {
  const model = getModel();
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      attempts++;
      if (attempts === 3) throw error;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Gemini failed after 3 attempts");
}

export async function generateChatResponse(
  systemInstruction: string,
  history: Array<{ role: "user" | "model"; text: string }>,
  message: string
): Promise<string> {
  const model = getModel(systemInstruction);
  const chat = model.startChat({
    history: history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
  });
  const result = await chat.sendMessage(message);
  return result.response.text();
}
