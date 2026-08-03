import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30_000,
  maxRetries: 0,
});

async function main() {
  console.log("[OpenAI test] Starting");

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: "Reply only with the word OK.",
  });

  console.log("[OpenAI test] Result:", response.output_text);
}

main().catch((error) => {
  console.error("[OpenAI test] Failed:", error);
  process.exitCode = 1;
});