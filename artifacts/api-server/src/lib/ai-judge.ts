import OpenAI from "openai";
import { buildFileContentSummary } from "./content-extractor.js";
import { preScreen, selectProvider, trackCost, hashText, type ProofSubmission } from "./ai-providers.js";
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
  proofRubric?: string;
  userTrustScore?: number;
  strictnessMode?: string;
  distractionCount?: number;
  missionPriority?: string;
  missionImpactLevel?: number;
}

export interface JudgeResult {
  verdict: "approved" | "partial" | "rejected" | "flagged" | "followup_needed" | "manual_review";
  confidenceScore: number;
  rewardMultiplier: number;
  explanation: string;
  followupQuestions?: string;
  providerUsed?: string;
  trustScoreDelta?: number;
  rubric: {
    relevanceScore: number;
    qualityScore: number;
    plausibilityScore: number;
    specificityScore: number;
  };
}

const SYSTEM_PROMPT = `You are a strict but fair AI judge for a Life RPG app.

Your job: evaluate if the user actually completed meaningful work based on their submitted proof.

Your standards:
- DO NOT approve based on time alone
- DO NOT approve vague/generic descriptions
- DO approve specific, detailed, honest submissions
- DO ask follow-up when evidence is unclear
- BE strict but never punitive — be a fair coach

For each submission, evaluate:
1. RELEVANCE: Does proof match the mission type?
2. SPECIFICITY: Does it show real work was done?
3. QUALITY: Is the output/learning meaningful?
4. PLAUSIBILITY: Is the claimed effort believable?

Return ONLY valid JSON. No markdown. No extra text.`;

function buildUserPrompt(ctx: ProofContext): string {
  const files = ctx.attachedFiles ?? [];
  const hasFiles = files.length > 0;
  const hasImage = files.some(f => f.type?.startsWith("image/"));

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

  return `MISSION:
Title: ${ctx.missionTitle}
Category: ${ctx.missionCategory}
Duration target: ${ctx.targetDurationMinutes} minutes
Priority: ${ctx.missionPriority ?? "medium"}
Impact level: ${ctx.missionImpactLevel ?? 5}/5
Purpose: ${ctx.missionDescription ?? ctx.missionPurpose ?? "Not specified"}

PROOF RUBRIC:
${ctx.proofRubric ?? "Must be specific to the task"}

SESSION DATA:
Actual duration: ${ctx.actualDurationMinutes} minutes
Left app count: ${ctx.distractionCount ?? 0} times

USER CONTEXT:
Trust score: ${ctx.userTrustScore ?? 1.0}
Strictness: ${ctx.strictnessMode ?? "normal"}

SUBMITTED PROOF:
Text: "${ctx.textSummary ?? ""}"
Has image: ${hasImage}
Has file: ${hasFiles}
Has link: ${ctx.links.length > 0}
${ctx.links.length > 0 ? `Links: ${ctx.links.join(", ")}` : ""}

${hasFiles ? `Attached Files:\n${fileSection}` : ""}
${ctx.followupAnswers ? `\nFOLLOW-UP ANSWER: ${ctx.followupAnswers}` : ""}

If image present, analyze:
- Is it relevant to this mission?
- Does it show actual work?

Evaluate and return JSON:
{
  "verdict": "approved|partial|rejected|followup_required",
  "confidence_score": 0.0-1.0,
  "quality_score": 0.0-1.0,
  "relevance_score": 0.0-1.0,
  "reward_multiplier": 0.0-1.5,
  "needs_followup": boolean,
  "followup_question": "specific question or null",
  "flags": [],
  "feedback_short": "1-2 sentences",
  "feedback_detailed": "specific actionable feedback",
  "trust_score_delta": -0.15 to 0.05
}

Flags can include:
LOW_EVIDENCE, GENERIC_SUMMARY, IRRELEVANT_PROOF,
DURATION_IMPLAUSIBLE, SUSPICIOUS_PATTERN`;
}

function filesHaveUsefulContent(files: AttachedFileInfo[]): boolean {
  return files.some(
    (f) => f.extractedText && f.extractedText.length > 30 &&
      !f.extractedText.startsWith("[") || (f.extractedText ?? "").length > 100,
  );
}

const VALID_VERDICTS = ["approved", "partial", "rejected", "flagged", "followup_needed", "followup_required"];

function normalizeVerdict(v: string): JudgeResult["verdict"] {
  if (v === "followup_required") return "followup_needed";
  if (v === "manual_review") return "flagged";
  if (VALID_VERDICTS.includes(v)) return v as JudgeResult["verdict"];
  return "rejected";
}

function validateAndNormalizeAiResponse(raw: string, providerName: string): JudgeResult | null {
  try {
    const parsed = JSON.parse(raw);

    const verdict = parsed.verdict ?? parsed.verdict;
    const confidenceScore = parsed.confidence_score ?? parsed.confidenceScore;
    const qualityScore = parsed.quality_score ?? parsed.qualityScore ?? parsed.rubric?.qualityScore;
    const relevanceScore = parsed.relevance_score ?? parsed.relevanceScore ?? parsed.rubric?.relevanceScore;
    const rewardMultiplier = parsed.reward_multiplier ?? parsed.rewardMultiplier;
    const feedbackShort = parsed.feedback_short ?? parsed.explanation ?? "";
    const feedbackDetailed = parsed.feedback_detailed ?? "";
    const followupQuestion = parsed.followup_question ?? parsed.followupQuestions;
    const trustDelta = parsed.trust_score_delta ?? parsed.trustScoreDelta ?? 0;

    if (verdict === undefined || confidenceScore === undefined) {
      console.error(`[AI Judge] Invalid response from ${providerName}: missing required fields`, raw.slice(0, 500));
      return null;
    }

    if (typeof confidenceScore !== "number" || confidenceScore < 0 || confidenceScore > 1) {
      console.error(`[AI Judge] Invalid confidence_score from ${providerName}:`, confidenceScore);
      return null;
    }

    const plausibilityScore = parsed.rubric?.plausibilityScore ?? parsed.plausibility_score ?? 0.5;
    const specificityScore = parsed.rubric?.specificityScore ?? parsed.specificity_score ?? 0.5;

    return {
      verdict: normalizeVerdict(verdict),
      confidenceScore: Math.max(0, Math.min(1, confidenceScore)),
      rewardMultiplier: Math.max(0, Math.min(1.5, rewardMultiplier ?? 1.0)),
      explanation: `${feedbackShort}${feedbackDetailed ? " " + feedbackDetailed : ""}`,
      followupQuestions: followupQuestion ?? undefined,
      providerUsed: providerName,
      trustScoreDelta: Math.max(-0.15, Math.min(0.05, trustDelta)),
      rubric: {
        relevanceScore: Math.max(0, Math.min(1, relevanceScore ?? 0)),
        qualityScore: Math.max(0, Math.min(1, qualityScore ?? 0)),
        plausibilityScore: Math.max(0, Math.min(1, plausibilityScore)),
        specificityScore: Math.max(0, Math.min(1, specificityScore)),
      },
    };
  } catch (err) {
    console.error(`[AI Judge] JSON parse error from ${providerName}:`, err, raw.slice(0, 500));
    return null;
  }
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
        explanation: `File content extracted and reviewed. ${missionMatch ? "Content appears relevant." : "File received but a written summary would improve your reward."} Adding a text summary will earn full reward.`,
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

  const lengthScore = Math.min(summary.length / 200, 1.0) * 0.3;

  const hasNumbers = /\d+/.test(summary);
  const hasTimeReference = /\b(hour|minute|min|hr|am|pm|morning|evening|today|yesterday)\b/i.test(summary);
  const words = summary.toLowerCase().split(/\s+/);

  const categoryTerms: Record<string, string[]> = {
    trading: ["chart", "trade", "position", "setup", "pattern", "analysis", "risk", "profit", "loss", "market"],
    fitness: ["reps", "sets", "run", "workout", "exercise", "weight", "cardio", "stretch", "squat", "bench"],
    learning: ["learned", "studied", "chapter", "concept", "understand", "notes", "lecture", "tutorial", "course"],
    deep_work: ["built", "coded", "wrote", "designed", "created", "implemented", "draft", "shipped", "deployed"],
    habit: ["routine", "streak", "morning", "evening", "daily", "consistency", "tracked"],
    sleep: ["sleep", "bed", "wake", "hours", "rest", "nap"],
  };
  const terms = categoryTerms[ctx.missionCategory] ?? [];
  const hasSpecificTerms = terms.some(t => summary.toLowerCase().includes(t));

  const specificityScore =
    (hasNumbers ? 0.2 : 0) +
    (hasTimeReference ? 0.1 : 0) +
    (wordCount > 30 ? 0.2 : 0) +
    (hasSpecificTerms ? 0.3 : 0);

  const missionWords = ctx.missionTitle.toLowerCase().split(/\s+/);
  const categoryWords = ctx.missionCategory.toLowerCase().split(/[_\s]+/);
  const relevantWords = [...missionWords, ...categoryWords];
  const matchCount = relevantWords.filter((w) => summary.toLowerCase().includes(w)).length;
  const relevanceScore = (matchCount / Math.max(1, relevantWords.length)) * 0.4;

  const qualityScore = lengthScore + specificityScore + relevanceScore;

  let verdict: JudgeResult["verdict"];
  let multiplier: number;
  if (qualityScore > 0.7) {
    verdict = "approved";
    multiplier = 1.0;
  } else if (qualityScore > 0.45) {
    verdict = "partial";
    multiplier = 0.6;
  } else if (qualityScore > 0.25) {
    verdict = "followup_needed";
    multiplier = 0;
  } else {
    verdict = "rejected";
    multiplier = 0;
  }

  const fileBonus = hasExtractedContent ? 0.1 : hasFiles ? 0.05 : 0;
  const linkBonus = hasLinks ? 0.1 : 0;
  if (verdict === "approved" || verdict === "partial") {
    multiplier = Math.min(1.0, multiplier + fileBonus + linkBonus);
  }

  return {
    verdict,
    confidenceScore: Math.min(0.85, 0.5 + qualityScore),
    rewardMultiplier: multiplier,
    explanation: verdict === "approved"
      ? "Proof accepted with adequate detail."
      : verdict === "partial"
        ? "Proof accepted with partial confidence. More specific details would earn a full reward."
        : verdict === "followup_needed"
          ? "Your proof needs more detail. Please describe specifically what you accomplished."
          : "Proof lacks sufficient detail or relevance.",
    followupQuestions: verdict === "followup_needed"
      ? "What specifically did you accomplish? What tools or methods did you use? What was the measurable outcome?"
      : undefined,
    providerUsed: "rules_enhanced",
    rubric: {
      relevanceScore: Math.min(1, relevanceScore * 2.5),
      qualityScore: Math.min(1, lengthScore * 3.3),
      plausibilityScore: Math.min(1, 0.5 + qualityScore),
      specificityScore: Math.min(1, specificityScore * 1.25),
    },
  };
}

async function openaiJudge(ctx: ProofContext, model: string): Promise<JudgeResult> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OpenAI not available");

  const userPrompt = buildUserPrompt(ctx);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const providerName = model === "gpt-4o" ? "openai_full" : "openai_mini";
  trackCost(providerName, response.usage?.total_tokens ?? Math.ceil((userPrompt.length + raw.length) / 4));

  const validated = validateAndNormalizeAiResponse(raw, providerName);
  if (!validated) {
    console.log(`[AI Judge] ${providerName} returned invalid response, falling back to rules`);
    const fallback = enhancedRuleBasedJudge(ctx);
    return { ...fallback, verdict: "flagged", providerUsed: `${providerName}_fallback` };
  }

  return validated;
}

let rulesOnlyCount = 0;

const AI_PROVIDER_ORDER = ["groq", "gemini_flash", "openai_mini", "openai_full"];

export { SYSTEM_PROMPT, buildUserPrompt, validateAndNormalizeAiResponse, enhancedRuleBasedJudge };

export async function judgeProof(ctx: ProofContext & { excludeProofId?: string }): Promise<JudgeResult> {
  const categoryConfig = (await import("./category-proof-requirements.js")).getProofRequirements(ctx.missionCategory);
  const categoryMinTextLength = categoryConfig.minimumTextLength;

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

  const screen = await preScreen(proofForScreening, categoryMinTextLength, ctx.excludeProofId);
  if (screen.skipAI) {
    rulesOnlyCount++;
    if (screen.verdict === "rejected") {
      return {
        verdict: "rejected",
        confidenceScore: 0.95,
        rewardMultiplier: 0,
        explanation: screen.feedback ?? "Proof rejected.",
        providerUsed: "pre_screen",
        trustScoreDelta: screen.trustScoreDelta,
        rubric: { relevanceScore: 0, qualityScore: 0, plausibilityScore: 0, specificityScore: 0 },
      };
    }
    if (screen.verdict === "followup_required") {
      return {
        verdict: "followup_needed",
        confidenceScore: 0.9,
        rewardMultiplier: 0,
        explanation: screen.feedback ?? "Your proof needs more detail.",
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
