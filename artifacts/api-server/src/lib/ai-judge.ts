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

export interface AttachedFileInfo {
  name: string;
  type: string;
  sizeKb: number;
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
  attachedFiles?: AttachedFileInfo[];
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

function ruleBasedJudge(ctx: ProofContext): JudgeResult {
  const summary = (ctx.textSummary ?? "").trim();
  const hasLinks = ctx.links.length > 0;
  const hasFiles = (ctx.attachedFiles ?? []).length > 0;
  const wordCount = summary.split(/\s+/).filter(Boolean).length;

  if (!summary && !hasLinks && !hasFiles) {
    return {
      verdict: "rejected",
      confidenceScore: 0.95,
      rewardMultiplier: 0,
      explanation: "No proof was provided. A text summary, link, or file upload is required.",
      rubric: { relevanceScore: 0, qualityScore: 0, plausibilityScore: 0, specificityScore: 0 },
    };
  }

  if (hasFiles && !summary && !hasLinks) {
    const fileBonus = ctx.attachedFiles!.length > 1 ? 0.75 : 0.6;
    return {
      verdict: "partial",
      confidenceScore: 0.72,
      rewardMultiplier: fileBonus,
      explanation: `File attachment${ctx.attachedFiles!.length > 1 ? "s" : ""} received as proof. Adding a written summary would increase your reward.`,
      rubric: { relevanceScore: 0.6, qualityScore: 0.55, plausibilityScore: 0.65, specificityScore: 0.45 },
    };
  }

  if (wordCount < 10) {
    return {
      verdict: "rejected",
      confidenceScore: 0.9,
      rewardMultiplier: 0,
      explanation: "Proof is too vague. Please describe specifically what you accomplished.",
      rubric: { relevanceScore: 0.1, qualityScore: 0.05, plausibilityScore: 0.1, specificityScore: 0.05 },
    };
  }

  if (wordCount < 30 && !hasLinks) {
    return {
      verdict: "partial",
      confidenceScore: 0.7,
      rewardMultiplier: 0.35,
      explanation: "Proof is brief. More specific details would earn a full reward.",
      rubric: { relevanceScore: 0.4, qualityScore: 0.3, plausibilityScore: 0.5, specificityScore: 0.2 },
    };
  }

  if (wordCount < 60 && !hasLinks) {
    return {
      verdict: "partial",
      confidenceScore: 0.75,
      rewardMultiplier: 0.55,
      explanation: "Proof is acceptable but lacks specific outcomes. Partial reward granted.",
      rubric: { relevanceScore: 0.55, qualityScore: 0.45, plausibilityScore: 0.6, specificityScore: 0.4 },
    };
  }

  const multiplier = hasLinks ? 0.9 : wordCount >= 100 ? 0.8 : 0.7;
  const quality = hasLinks ? 0.85 : wordCount >= 100 ? 0.75 : 0.65;

  return {
    verdict: "approved",
    confidenceScore: 0.8,
    rewardMultiplier: multiplier,
    explanation: `Proof accepted. ${hasLinks ? "Evidence links noted. " : ""}Good level of detail provided.`,
    rubric: {
      relevanceScore: quality,
      qualityScore: quality - 0.05,
      plausibilityScore: quality + 0.05,
      specificityScore: hasLinks ? quality : quality - 0.1,
    },
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

  const hasFiles = (ctx.attachedFiles ?? []).length > 0;
  const hasProof = ctx.textSummary || ctx.links.length > 0 || hasFiles;

  const fileDesc = hasFiles
    ? ctx.attachedFiles!.map((f) => `  - ${f.name} (${f.type}, ${f.sizeKb}KB)`).join("\n")
    : "None";

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
Attached Files:\n${fileDesc}
${ctx.followupAnswers ? `Follow-up Answers: ${ctx.followupAnswers}` : ""}

${!hasProof ? "WARNING: No proof was submitted at all." : ""}
${hasFiles && !ctx.textSummary ? "NOTE: Files attached but no written summary. Consider a follow-up if the file content is unclear from metadata alone." : ""}

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
    console.error("AI judge error, using rule-based fallback:", err);
    return ruleBasedJudge(ctx);
  }
}
