import Groq from "groq-sdk";
import type { JudgeResult, ProofContext } from "../ai-judge.js";
import { SYSTEM_PROMPT, buildUserPrompt, validateAndNormalizeAiResponse, enhancedRuleBasedJudge } from "../ai-judge.js";
import { trackCost } from "../ai-providers.js";

let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export async function groqJudge(ctx: ProofContext): Promise<JudgeResult> {
  const client = getGroq();
  const userPrompt = buildUserPrompt(ctx);

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  trackCost("groq", response.usage?.total_tokens ?? Math.ceil((userPrompt.length + raw.length) / 4));

  const validated = validateAndNormalizeAiResponse(raw, "groq");
  if (!validated) {
    console.log("[AI Judge] Groq returned invalid response, falling back to rules");
    const fallback = enhancedRuleBasedJudge(ctx);
    return { ...fallback, verdict: "manual_review", rewardMultiplier: 0, providerUsed: "groq_fallback" };
  }

  return validated;
}
