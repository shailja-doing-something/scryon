import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function generateContent(prompt: string): Promise<string> {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      });
      const block = message.content[0];
      if (block.type !== "text") throw new Error("Unexpected response type");
      return block.text;
    } catch (error) {
      attempts++;
      if (attempts === 3) throw error;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Claude failed after 3 attempts");
}
