import Groq from "groq-sdk";
import type { JudgeResult, ProofContext } from "../ai-judge.js";
import { trackCost } from "../ai-providers.js";

let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

const SYSTEM_PROMPT = `You are DisciplineOS AI Judge — a strict, fair evaluator of work proof submissions.
Your job is to determine if submitted proof genuinely demonstrates that real work was done on a mission.

Be strict but fair:
- Vague text summaries get low scores
- Generic phrases ("I worked on it", "made progress") = rejection
- Specific outcomes, deliverables, challenges overcome = high scores
- If file content is extracted and relevant to the mission, it counts as stronger evidence
- Always return valid JSON matching the schema exactly`;

function buildPrompt(ctx: ProofContext): string {
  const fileSection = ctx.attachedFiles?.length
    ? ctx.attachedFiles.map((f) => `- ${f.name} (${f.type}, ${f.sizeKb}KB): ${f.extractedText?.slice(0, 500) || "No extracted content"}`).join("\n")
    : "None";

  return `Evaluate this proof submission:

MISSION: "${ctx.missionTitle}"
Category: ${ctx.missionCategory}
Purpose: ${ctx.missionPurpose ?? "Not specified"}
Target Duration: ${ctx.targetDurationMinutes} minutes
Actual Duration: ${ctx.actualDurationMinutes} minutes

SUBMITTED PROOF:
Text Summary: ${ctx.textSummary ?? "None provided"}
Links: ${ctx.links.length > 0 ? ctx.links.join(", ") : "None"}
Attached Files:
${fileSection}

Return ONLY a JSON object with EXACTLY these fields (no markdown):
{
  "verdict": "approved" | "partial" | "rejected" | "flagged" | "followup_needed",
  "confidenceScore": 0.0 to 1.0,
  "rewardMultiplier": 0.0 to 1.0,
  "explanation": "1-2 sentences explaining the decision",
  "followupQuestions": null or "questions to ask",
  "rubric": {
    "relevanceScore": 0.0 to 1.0,
    "qualityScore": 0.0 to 1.0,
    "plausibilityScore": 0.0 to 1.0,
    "specificityScore": 0.0 to 1.0
  }
}`;
}

export async function groqJudge(ctx: ProofContext): Promise<JudgeResult> {
  const client = getGroq();
  const prompt = buildPrompt(ctx);

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  trackCost("groq", response.usage?.total_tokens ?? Math.ceil((prompt.length + raw.length) / 4));

  const parsed = JSON.parse(raw) as JudgeResult;

  return {
    verdict: ["approved", "partial", "rejected", "flagged", "followup_needed"].includes(parsed.verdict)
      ? parsed.verdict
      : "rejected",
    confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore ?? 0)),
    rewardMultiplier: Math.max(0, Math.min(1, parsed.rewardMultiplier ?? 0)),
    explanation: parsed.explanation ?? "Unable to evaluate.",
    followupQuestions: parsed.followupQuestions ?? undefined,
    rubric: {
      relevanceScore: Math.max(0, Math.min(1, parsed.rubric?.relevanceScore ?? 0)),
      qualityScore: Math.max(0, Math.min(1, parsed.rubric?.qualityScore ?? 0)),
      plausibilityScore: Math.max(0, Math.min(1, parsed.rubric?.plausibilityScore ?? 0)),
      specificityScore: Math.max(0, Math.min(1, parsed.rubric?.specificityScore ?? 0)),
    },
  };
}
