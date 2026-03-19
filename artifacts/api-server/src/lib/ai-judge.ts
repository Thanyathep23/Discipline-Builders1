import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "no-key",
    });
  }
  return openaiClient;
}

export interface ProofContext {
  missionTitle: string;
  missionDescription: string | null;
  missionPurpose: string | null;
  missionCategory: string;
  targetDurationMinutes: number;
  actualDurationMinutes: number;
  textSummary: string | null;
  links: string[];
  requiredProofTypes: string[];
  followupAnswers?: string | null;
}

export interface JudgeResult {
  verdict: "approved" | "partial" | "rejected" | "flagged" | "followup_needed";
  confidenceScore: number;
  rewardMultiplier: number;
  explanation: string;
  followupQuestions?: string;
  rubric: {
    relevanceScore: number;
    qualityScore: number;
    plausibilityScore: number;
    specificityScore: number;
  };
}

export async function judgeProof(ctx: ProofContext): Promise<JudgeResult> {
  const openai = getOpenAI();

  const systemPrompt = `You are DisciplineOS AI Judge — a strict, fair evaluator of work proof submissions.
Your job is to determine if submitted proof genuinely demonstrates that real work was done on a mission.

Be strict but fair:
- Vague text summaries get low scores
- Generic phrases ("I worked on it", "made progress") = rejection
- Specific outcomes, deliverables, challenges overcome = high scores
- Always return valid JSON matching the schema exactly`;

  const hasProof = ctx.textSummary || ctx.links.length > 0;

  const userPrompt = `Evaluate this proof submission:

MISSION: "${ctx.missionTitle}"
Category: ${ctx.missionCategory}
Purpose: ${ctx.missionPurpose ?? "Not specified"}
Description: ${ctx.missionDescription ?? "Not specified"}
Target Duration: ${ctx.targetDurationMinutes} minutes
Actual Duration: ${ctx.actualDurationMinutes} minutes
Required Proof Types: ${ctx.requiredProofTypes.join(", ")}

SUBMITTED PROOF:
Text Summary: ${ctx.textSummary ?? "None provided"}
Links: ${ctx.links.length > 0 ? ctx.links.join(", ") : "None"}
${ctx.followupAnswers ? `Follow-up Answers: ${ctx.followupAnswers}` : ""}

${!hasProof ? "WARNING: No proof was submitted at all." : ""}

Return a JSON object with EXACTLY these fields:
{
  "verdict": "approved" | "partial" | "rejected" | "flagged" | "followup_needed",
  "confidenceScore": 0.0 to 1.0,
  "rewardMultiplier": 0.0 to 1.0,
  "explanation": "1-2 sentences explaining the decision",
  "followupQuestions": "questions to ask user" (only if verdict is followup_needed, otherwise null),
  "rubric": {
    "relevanceScore": 0.0 to 1.0,
    "qualityScore": 0.0 to 1.0,
    "plausibilityScore": 0.0 to 1.0,
    "specificityScore": 0.0 to 1.0
  }
}

Rules:
- No proof = rejected, multiplier 0
- Very short/vague text (under 30 words with no specifics) = followup_needed or rejected
- Good specific summary with outcomes = approved, multiplier 0.7-1.0
- Great detail + links = approved, multiplier 0.9-1.0
- Suspicious (claimed 8h done in 10 min, etc.) = flagged`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as JudgeResult;

    // Validate and clamp values
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
  } catch (err) {
    console.error("AI judge error:", err);
    // Fallback for missing API key or errors
    return {
      verdict: "flagged",
      confidenceScore: 0,
      rewardMultiplier: 0,
      explanation: "AI evaluation unavailable. Flagged for manual review.",
      rubric: { relevanceScore: 0, qualityScore: 0, plausibilityScore: 0, specificityScore: 0 },
    };
  }
}
