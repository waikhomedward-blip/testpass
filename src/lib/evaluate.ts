import Anthropic from "@anthropic-ai/sdk";
import { CategoryConfig } from "./primitives";
import { EvidenceVerdict, AssociationStrength } from "./types";

export interface EvaluationInput {
  config: CategoryConfig;
  images: { mediaType: "image/jpeg" | "image/png"; base64: string }[];
  context: string; // e.g. Bluetooth read results, as plain text for the model
}

export interface EvaluationResult {
  verdict: EvidenceVerdict;
  reasoning: string;
  associationStrength: AssociationStrength;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY isn't set. Automatic evidence evaluation needs a key from console.anthropic.com."
    );
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const VERDICTS: EvidenceVerdict[] = ["DEMONSTRATED", "FAILED", "INCONCLUSIVE"];
const STRENGTHS: AssociationStrength[] = ["STRONG", "MODERATE", "WEAK", "INCONCLUSIVE"];

/**
 * Sends the submitted capture (photos + any device-reported context) to
 * Claude and returns a verdict. This is the "automatic evaluation" step of
 * TestPass: the evaluator only ever reports what the evidence supports —
 * see the strict-JSON contract in each category's evaluationPromptSystem.
 */
export async function evaluateEvidence(input: EvaluationInput): Promise<EvaluationResult> {
  const { config, images, context } = input;

  const content: Anthropic.MessageParam["content"] = [];
  for (const img of images) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    });
  }
  content.push({
    type: "text",
    text: `Device-reported context (may be empty):\n${context || "(none)"}\n\nEvaluate the evidence now and respond with the JSON object only.`,
  });

  const message = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: config.evaluationPromptSystem,
    messages: [{ role: "user", content }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  return parseVerdict(raw);
}

function parseVerdict(raw: string): EvaluationResult {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    const verdict = VERDICTS.includes(parsed.verdict) ? parsed.verdict : "INCONCLUSIVE";
    const associationStrength = STRENGTHS.includes(parsed.association_strength)
      ? parsed.association_strength
      : "INCONCLUSIVE";
    const reasoning =
      typeof parsed.reasoning === "string" && parsed.reasoning.trim()
        ? parsed.reasoning.trim()
        : "The evaluator did not return a usable explanation.";
    return { verdict, reasoning, associationStrength };
  } catch {
    // Fail closed: a malformed model response is evidence quality we can't
    // vouch for, not proof the device passed.
    return {
      verdict: "INCONCLUSIVE",
      reasoning:
        "TestPass couldn't reliably score this submission automatically. Treat this as ungraded and consider asking the seller for a retest.",
      associationStrength: "INCONCLUSIVE",
    };
  }
}
