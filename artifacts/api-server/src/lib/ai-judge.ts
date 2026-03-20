import OpenAI from "openai";
import { buildFileContentSummary } from "./content-extractor.js";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY ?? "no-key";
  if (key === "no-key" || !key) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: key });
  return openaiClient;
}

export interface AttachedFileInfo {
  name: string;
  type: string;
  sizeKb: number;
  extractedText?: string;
  extractionStatus?: string;
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

function filesHaveUsefulContent(files: AttachedFileInfo[]): boolean {
  return files.some(
    (f) => f.extractedText && f.extractedText.length > 30 &&
      !f.extractedText.startsWith("[") || (f.extractedText ?? "").length > 100,
  );
}

function ruleBasedJudge(ctx: ProofContext): JudgeResult {
  const summary = (ctx.textSummary ?? "").trim();
  const hasLinks = ctx.links.length > 0;
  const files = ctx.attachedFiles ?? [];
  const hasFiles = files.length > 0;
  const wordCount = summary.split(/\s+/).filter(Boolean).length;
  const hasExtractedContent = filesHaveUsefulContent(files);

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
    if (hasExtractedContent) {
      const relevantFile = files.find((f) => f.extractedText && f.extractedText.length > 30);
      const extractedSnippet = relevantFile?.extractedText?.slice(0, 120) ?? "";
      const missionMatch = extractedSnippet.toLowerCase().includes(ctx.missionCategory.toLowerCase());
      const multiplier = missionMatch ? 0.75 : 0.6;
      return {
        verdict: "partial",
        confidenceScore: 0.78,
        rewardMultiplier: multiplier,
        explanation: `File content extracted and reviewed. ${missionMatch ? "Content appears relevant to your mission." : "File received but a written summary would improve your reward."} Adding a text summary will earn full reward.`,
        rubric: {
          relevanceScore: missionMatch ? 0.7 : 0.55,
          qualityScore: 0.6,
          plausibilityScore: 0.7,
          specificityScore: missionMatch ? 0.6 : 0.45,
        },
      };
    }
    return {
      verdict: "partial",
      confidenceScore: 0.72,
      rewardMultiplier: 0.55,
      explanation: `File attachment${files.length > 1 ? "s" : ""} received as proof. Adding a written summary would increase your reward.`,
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

  if (wordCount < 30 && !hasLinks && !hasFiles) {
    return {
      verdict: "partial",
      confidenceScore: 0.7,
      rewardMultiplier: 0.35,
      explanation: "Proof is brief. More specific details would earn a full reward.",
      rubric: { relevanceScore: 0.4, qualityScore: 0.3, plausibilityScore: 0.5, specificityScore: 0.2 },
    };
  }

  if (wordCount < 60 && !hasLinks && !hasFiles) {
    return {
      verdict: "partial",
      confidenceScore: 0.75,
      rewardMultiplier: 0.55,
      explanation: "Proof is acceptable but lacks specific outcomes. Partial reward granted.",
      rubric: { relevanceScore: 0.55, qualityScore: 0.45, plausibilityScore: 0.6, specificityScore: 0.4 },
    };
  }

  const fileBonus = hasExtractedContent ? 0.1 : hasFiles ? 0.05 : 0;
  const linkBonus = hasLinks ? 0.1 : 0;
  const wordBonus = wordCount >= 100 ? 0.1 : wordCount >= 60 ? 0.05 : 0;

  const baseMultiplier = 0.65 + fileBonus + linkBonus + wordBonus;
  const multiplier = Math.min(1.0, baseMultiplier);
  const quality = Math.min(0.95, 0.6 + fileBonus + linkBonus + wordBonus);

  let explanation = "Proof accepted.";
  if (hasExtractedContent) explanation += " File content reviewed and noted.";
  else if (hasFiles) explanation += " Files attached.";
  if (hasLinks) explanation += " Evidence links noted.";
  explanation += " Good level of detail provided.";

  return {
    verdict: "approved",
    confidenceScore: 0.82,
    rewardMultiplier: multiplier,
    explanation,
    rubric: {
      relevanceScore: quality,
      qualityScore: quality - 0.05,
      plausibilityScore: quality + 0.03,
      specificityScore: hasExtractedContent || hasLinks ? quality : quality - 0.1,
    },
  };
}

export async function judgeProof(ctx: ProofContext): Promise<JudgeResult> {
  const openai = getOpenAI();
  if (!openai) {
    return ruleBasedJudge(ctx);
  }

  const files = ctx.attachedFiles ?? [];
  const hasFiles = files.length > 0;
  const hasProof = ctx.textSummary || ctx.links.length > 0 || hasFiles;

  const fileSection = hasFiles
    ? buildFileContentSummary(
        files.map((f) => ({
          originalName: f.name,
          mimeType: f.type,
          fileSize: f.sizeKb * 1024,
          extractedText: f.extractedText,
          extractionStatus: f.extractionStatus,
        })),
      )
    : "None";

  const hasExtractedContent = filesHaveUsefulContent(files);

  const systemPrompt = `You are DisciplineOS AI Judge — a strict, fair evaluator of work proof submissions.
Your job is to determine if submitted proof genuinely demonstrates that real work was done on a mission.

Be strict but fair:
- Vague text summaries get low scores
- Generic phrases ("I worked on it", "made progress") = rejection
- Specific outcomes, deliverables, challenges overcome = high scores
- If file content is extracted and relevant to the mission, it counts as stronger evidence
- If a file is unrelated to the mission, it should NOT boost the score
- Always return valid JSON matching the schema exactly`;

  const userPrompt = `Evaluate this proof submission:

MISSION: "${ctx.missionTitle}"
Category: ${ctx.missionCategory}
Purpose: ${ctx.missionPurpose ?? "Not specified"}
Description: ${ctx.missionDescription ?? "Not specified"}
Target Duration: ${ctx.targetDurationMinutes} minutes
Actual Duration: ${ctx.actualDurationMinutes} minutes
Required Proof Types: ${ctx.requiredProofTypes.join(", ") || "None specified"}

SUBMITTED PROOF:
Text Summary: ${ctx.textSummary ?? "None provided"}
Links: ${ctx.links.length > 0 ? ctx.links.join(", ") : "None"}
Attached Files:
${fileSection}
${ctx.followupAnswers ? `Follow-up Answers: ${ctx.followupAnswers}` : ""}

${!hasProof ? "WARNING: No proof was submitted at all." : ""}
${hasFiles && hasExtractedContent ? "NOTE: File content was successfully extracted — evaluate the actual content, not just the file's presence." : ""}
${hasFiles && !hasExtractedContent ? "NOTE: Files were attached but content could not be extracted. Judge file presence as weak supporting evidence only." : ""}

Return a JSON object with EXACTLY these fields:
{
  "verdict": "approved" | "partial" | "rejected" | "flagged" | "followup_needed",
  "confidenceScore": 0.0 to 1.0,
  "rewardMultiplier": 0.0 to 1.0,
  "explanation": "1-2 sentences explaining the decision. Mention extracted file evidence if it influenced the score.",
  "followupQuestions": "questions to ask user" (only if verdict is followup_needed, otherwise null),
  "rubric": {
    "relevanceScore": 0.0 to 1.0,
    "qualityScore": 0.0 to 1.0,
    "plausibilityScore": 0.0 to 1.0,
    "specificityScore": 0.0 to 1.0
  }
}

Scoring rules:
- No proof = rejected, multiplier 0
- Very short/vague text (under 30 words with no specifics) = followup_needed or rejected
- Good specific summary with outcomes = approved, multiplier 0.7-1.0
- Great detail + relevant file content + links = approved, multiplier 0.9-1.0
- File present but irrelevant to mission = weak bonus only (max +0.05 multiplier)
- File present and clearly relevant (extracted content matches mission) = moderate bonus (up to +0.15 multiplier)
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
