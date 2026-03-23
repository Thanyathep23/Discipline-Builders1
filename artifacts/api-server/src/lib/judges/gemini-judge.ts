import type { JudgeResult, ProofContext } from "../ai-judge.js";
import { SYSTEM_PROMPT, buildUserPrompt, validateAndNormalizeAiResponse, enhancedRuleBasedJudge } from "../ai-judge.js";
import { trackCost } from "../ai-providers.js";

let genAI: any = null;

async function getGeminiClient() {
  if (genAI) return genAI;
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return genAI;
}

export async function geminiJudge(ctx: ProofContext): Promise<JudgeResult> {
  const client = await getGeminiClient();
  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const userPrompt = buildUserPrompt(ctx);
  const result = await model.generateContent([SYSTEM_PROMPT + "\n\n" + userPrompt]);
  const text = result.response.text();

  trackCost("gemini_flash", Math.ceil((userPrompt.length + text.length) / 4));

  const validated = validateAndNormalizeAiResponse(text, "gemini_flash");
  if (!validated) {
    console.log("[AI Judge] Gemini returned invalid response, falling back to rules");
    const fallback = enhancedRuleBasedJudge(ctx);
    return { ...fallback, verdict: "flagged", providerUsed: "gemini_flash_fallback" };
  }

  return validated;
}
