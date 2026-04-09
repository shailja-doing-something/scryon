import { GoogleGenerativeAI } from "@google/generative-ai";

const PRIMARY_MODEL = "gemini-2.0-flash";
const FALLBACK_MODEL = "gemini-2.0-flash-lite";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateContent(
  prompt: string,
  useFallback = false
): Promise<string> {
  const modelName = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;

  console.log(`[Gemini] Using model: ${modelName}`);

  const model = genAI.getGenerativeModel({ model: modelName });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      attempts++;
      const msg = error instanceof Error ? error.message : String(error);

      console.log(`[Gemini] ${modelName} attempt ${attempts} failed: ${msg}`);

      const is503 = msg.includes("503");
      const is404 = msg.includes("404");

      // 404 means wrong model name — do not retry
      if (is404) {
        throw new Error(`Model ${modelName} not found. Check model name.`);
      }

      // On 503, switch to fallback immediately rather than waiting
      if (is503 && !useFallback) {
        console.log("[Gemini] 503 detected — switching to fallback model");
        return generateContent(prompt, true);
      }

      if (attempts >= maxAttempts) {
        if (!useFallback) {
          console.log("[Gemini] Switching to fallback model...");
          return generateContent(prompt, true);
        }
        throw error;
      }

      const delay = is503 ? 5000 : 2000;
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
  const model = genAI.getGenerativeModel({
    model: PRIMARY_MODEL,
    systemInstruction,
  });
  const chat = model.startChat({
    history: history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
  });
  const result = await chat.sendMessage(message);
  return result.response.text();
}
