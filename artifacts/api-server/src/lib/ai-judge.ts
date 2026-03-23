import OpenAI from "openai";
import { buildFileContentSummary } from "./content-extractor.js";
import { preScreen, selectProvider, trackCost, logDailySummary, type ProofSubmission } from "./ai-providers.js";
import { geminiJudge } from "./judges/gemini-judge.js";
import { groqJudge } from "./judges/groq-judge.js";

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
  userId?: string;
}

export interface JudgeResult {
  verdict: "approved" | "partial" | "rejected" | "flagged" | "followup_needed";
  confidenceScore: number;
  rewardMultiplier: number;
  explanation: string;
  followupQuestions?: string;
  providerUsed?: string;
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

function enhancedRuleBasedJudge(ctx: ProofContext): JudgeResult {
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
      providerUsed: "rules",
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
        providerUsed: "rules",
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
      providerUsed: "rules",
      rubric: { relevanceScore: 0.6, qualityScore: 0.55, plausibilityScore: 0.65, specificityScore: 0.45 },
    };
  }

  if (wordCount < 10) {
    return {
      verdict: "rejected",
      confidenceScore: 0.9,
      rewardMultiplier: 0,
      explanation: "Proof is too vague. Please describe specifically what you accomplished.",
      providerUsed: "rules",
      rubric: { relevanceScore: 0.1, qualityScore: 0.05, plausibilityScore: 0.1, specificityScore: 0.05 },
    };
  }

  const words = summary.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const hasNumbers = /\d+/.test(summary);
  const hasSpecificDetails = uniqueWords.size / words.length > 0.6;

  const textLengthScore = Math.min(0.3, (wordCount / 200) * 0.3);
  const specificityScore = Math.min(0.4,
    (hasSpecificDetails ? 0.2 : 0.05) +
    (hasNumbers ? 0.1 : 0) +
    (uniqueWords.size > 30 ? 0.1 : uniqueWords.size > 15 ? 0.05 : 0),
  );

  const missionWords = ctx.missionTitle.toLowerCase().split(/\s+/);
  const categoryWords = ctx.missionCategory.toLowerCase().split(/\s+/);
  const relevantWords = [...missionWords, ...categoryWords];
  const matchCount = relevantWords.filter((w) => summary.toLowerCase().includes(w)).length;
  const relevanceScore = Math.min(0.3, (matchCount / Math.max(1, relevantWords.length)) * 0.3);

  const totalScore = textLengthScore + specificityScore + relevanceScore;

  const fileBonus = hasExtractedContent ? 0.1 : hasFiles ? 0.05 : 0;
  const linkBonus = hasLinks ? 0.1 : 0;
  const baseMultiplier = Math.min(1.0, 0.4 + totalScore + fileBonus + linkBonus);

  const verdict = totalScore >= 0.6 ? "approved" : totalScore >= 0.3 ? "partial" : "rejected";

  return {
    verdict,
    confidenceScore: Math.min(0.85, 0.5 + totalScore),
    rewardMultiplier: verdict === "rejected" ? 0 : baseMultiplier,
    explanation: verdict === "approved"
      ? "Proof accepted with adequate detail."
      : verdict === "partial"
        ? "Proof accepted with partial confidence. More specific details would earn a full reward."
        : "Proof lacks sufficient detail or relevance.",
    providerUsed: "rules_enhanced",
    rubric: {
      relevanceScore: Math.min(1, relevanceScore * 3.3),
      qualityScore: Math.min(1, textLengthScore * 3.3),
      plausibilityScore: Math.min(1, 0.5 + totalScore),
      specificityScore: Math.min(1, specificityScore * 2.5),
    },
  };
}

async function openaiJudge(ctx: ProofContext, model: string): Promise<JudgeResult> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OpenAI not available");

  const files = ctx.attachedFiles ?? [];
  const hasFiles = files.length > 0;
  const hasProof = ctx.textSummary || ctx.links.length > 0 || hasFiles;
  const hasExtractedContent = filesHaveUsefulContent(files);

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
  "explanation": "1-2 sentences explaining the decision.",
  "followupQuestions": "questions to ask user" (only if verdict is followup_needed, otherwise null),
  "rubric": {
    "relevanceScore": 0.0 to 1.0,
    "qualityScore": 0.0 to 1.0,
    "plausibilityScore": 0.0 to 1.0,
    "specificityScore": 0.0 to 1.0
  }
}`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const providerName = model === "gpt-4o" ? "openai_full" : "openai_mini";
  trackCost(providerName, response.usage?.total_tokens ?? Math.ceil((userPrompt.length + raw.length) / 4));

  const parsed = JSON.parse(raw) as JudgeResult;

  return {
    verdict: ["approved", "partial", "rejected", "flagged", "followup_needed"].includes(parsed.verdict)
      ? parsed.verdict
      : "rejected",
    confidenceScore: Math.max(0, Math.min(1, parsed.confidenceScore ?? 0)),
    rewardMultiplier: Math.max(0, Math.min(1, parsed.rewardMultiplier ?? 0)),
    explanation: parsed.explanation ?? "Unable to evaluate.",
    followupQuestions: parsed.followupQuestions ?? undefined,
    providerUsed: providerName,
    rubric: {
      relevanceScore: Math.max(0, Math.min(1, parsed.rubric?.relevanceScore ?? 0)),
      qualityScore: Math.max(0, Math.min(1, parsed.rubric?.qualityScore ?? 0)),
      plausibilityScore: Math.max(0, Math.min(1, parsed.rubric?.plausibilityScore ?? 0)),
      specificityScore: Math.max(0, Math.min(1, parsed.rubric?.specificityScore ?? 0)),
    },
  };
}

let rulesOnlyCount = 0;

const AI_PROVIDER_ORDER = ["gemini_flash", "groq", "openai_mini", "openai_full"];

export async function judgeProof(ctx: ProofContext): Promise<JudgeResult> {
  const proofForScreening: ProofSubmission = {
    summary: ctx.textSummary,
    files: ctx.attachedFiles?.map((f) => ({
      name: f.name,
      type: f.type,
      sizeKb: f.sizeKb,
      extractedText: f.extractedText,
      mimeType: f.type,
    })),
    links: ctx.links,
    userId: ctx.userId ?? "unknown",
  };

  const screen = preScreen(proofForScreening);
  if (screen.skipAI) {
    rulesOnlyCount++;
    if (screen.verdict === "rejected") {
      const reason = screen.reason === "no_proof"
        ? "No proof was provided."
        : screen.reason === "too_short"
          ? "Proof is too short. Please provide more detail."
          : screen.reason === "duplicate"
            ? "This proof appears to be a duplicate of a previous submission."
            : "Proof rejected.";
      return {
        verdict: "rejected",
        confidenceScore: 0.95,
        rewardMultiplier: 0,
        explanation: reason,
        providerUsed: "pre_screen",
        rubric: { relevanceScore: 0, qualityScore: 0, plausibilityScore: 0, specificityScore: 0 },
      };
    }
    if (screen.verdict === "followup_required") {
      return {
        verdict: "followup_needed",
        confidenceScore: 0.9,
        rewardMultiplier: 0,
        explanation: "Your proof is too generic. Please describe specifically what you accomplished, what tools you used, and what the outcome was.",
        followupQuestions: "What specifically did you accomplish? What tools or methods did you use? What was the measurable outcome?",
        providerUsed: "pre_screen",
        rubric: { relevanceScore: 0.1, qualityScore: 0.05, plausibilityScore: 0.2, specificityScore: 0.05 },
      };
    }
  }

  const selectedProvider = selectProvider(proofForScreening);

  const tryProvider = async (provider: string): Promise<JudgeResult> => {
    switch (provider) {
      case "gemini_flash":
        return await geminiJudge(ctx);
      case "groq":
        return await groqJudge(ctx);
      case "openai_mini":
        return await openaiJudge(ctx, "gpt-4o-mini");
      case "openai_full":
        return await openaiJudge(ctx, "gpt-4o");
      default:
        return enhancedRuleBasedJudge(ctx);
    }
  };

  const startIdx = AI_PROVIDER_ORDER.indexOf(selectedProvider);
  const orderedProviders = startIdx >= 0
    ? [...AI_PROVIDER_ORDER.slice(startIdx), ...AI_PROVIDER_ORDER.slice(0, startIdx)]
    : AI_PROVIDER_ORDER;

  for (const provider of orderedProviders) {
    try {
      const result = await tryProvider(provider);
      return { ...result, providerUsed: result.providerUsed ?? provider };
    } catch (err) {
      console.error(`AI judge provider "${provider}" failed, trying next:`, err);
      continue;
    }
  }

  console.log("[AI Judge] All AI providers failed, using enhanced rule-based fallback");
  rulesOnlyCount++;
  return enhancedRuleBasedJudge(ctx);
}
