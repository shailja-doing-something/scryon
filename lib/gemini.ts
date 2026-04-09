import { GoogleGenerativeAI } from "@google/generative-ai";

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-1.5-pro";

function getModel(modelName: string, systemInstruction?: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI.getGenerativeModel({ model: modelName, systemInstruction });
}

export async function generateContent(
  prompt: string,
  useFallback = false
): Promise<string> {
  const modelName = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
  const model = getModel(modelName);

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      attempts++;
      console.log(
        `[Gemini] ${modelName} attempt ${attempts} failed:`,
        error instanceof Error ? error.message : error
      );

      if (attempts >= maxAttempts) {
        if (!useFallback) {
          console.log("[Gemini] Primary model exhausted — switching to fallback model...");
          return generateContent(prompt, true);
        }
        throw error;
      }

      const is503 = error instanceof Error && error.message.includes("503");
      const delay = is503 ? attempts * 10000 : attempts * 2000;

      console.log(`[Gemini] Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("All Gemini models failed");
}

export async function generateChatResponse(
  systemInstruction: string,
  history: Array<{ role: "user" | "model"; text: string }>,
  message: string
): Promise<string> {
  const model = getModel(PRIMARY_MODEL, systemInstruction);
  const chat = model.startChat({
    history: history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
  });
  const result = await chat.sendMessage(message);
  return result.response.text();
}
