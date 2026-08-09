import OpenAI from "openai";

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function llmEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export type StepResult = {
  tool: string;
  detail: string;
  result: string;
  thinking?: string;
  askHuman?: { question: string; options: string[] };
  cancelStepIds?: string[];
  gateDescription?: string;
};

function scenarioFor(templateId: string) {
  if (templateId === "failing-test") return "CI is red on checkout after a promo-code change.";
  if (templateId === "incident-reply") return "Checkout errors spiked after deploy; room must co-write the customer update.";
  return "Production checkout 500s for some guest checkouts — likely null tax/total or a race. Pair with humans; do not autopilot.";
}

export async function runStepWithLlm(input: {
  roomTitle: string;
  templateId: string;
  stepTitle: string;
  priorFindings: string[];
  steers: string[];
  forceDecision?: boolean;
}): Promise<StepResult> {
  const client = getClient();
  if (!client) throw new Error("OPENAI_API_KEY missing");

  const completion = await client.chat.completions.create({
    model: getModel(),
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an engineering agent in a MULTIplayer Room. Humans are watching and will decide.
Do ONE concrete step. Be specific (commands, SQL, code, diffs). Do NOT repeat prior drafts verbatim.
If this step is about hypotheses / tone options / choosing a path, or forceDecision=true, you MUST set askHuman with a sharp question and 2-3 short options.
Return JSON keys: tool, detail, result, thinking, askHuman?: {question, options[]}, cancelStepIds?: string[], gateDescription?: string.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          roomTitle: input.roomTitle,
          scenario: scenarioFor(input.templateId),
          currentStep: input.stepTitle,
          priorFindings: input.priorFindings,
          humanSteers: input.steers,
          forceDecision: Boolean(input.forceDecision),
        }),
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as Partial<StepResult>;
  return {
    tool: parsed.tool || "agent.think",
    detail: parsed.detail || input.stepTitle,
    result: parsed.result || "No output",
    thinking: parsed.thinking,
    askHuman: parsed.askHuman,
    cancelStepIds: parsed.cancelStepIds,
    gateDescription: parsed.gateDescription,
  };
}

export async function interpretHumanDirective(input: {
  roomTitle: string;
  templateId: string;
  directive: string;
  planTitles: string[];
  priorFindings: string[];
}): Promise<{
  reply: string;
  runStepTitle?: string;
  customAction?: string;
  cancelStepIds?: string[];
  done?: boolean;
}> {
  const client = getClient();
  if (!client) throw new Error("OPENAI_API_KEY missing");

  const completion = await client.chat.completions.create({
    model: getModel(),
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Human is driving the Room. Interpret their instruction.
Return JSON:
reply (what you will do next, 1-3 short sentences — no fluff),
runStepTitle (optional — match a plan step title to execute next),
customAction (optional — freeform work if not a plan step),
cancelStepIds (optional string[] of plan step ids like "s5" to skip — e.g. skip PR / don't open PR / stop before PR → cancel the Open pull request step),
done (true only if they want to stop/summarize and finish).
If they say skip PR / no PR / draft only / don't open a PR, you MUST cancel that step id.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          ...input,
          scenario: scenarioFor(input.templateId),
        }),
      },
    ],
  });

  return JSON.parse(completion.choices[0]?.message?.content || "{}");
}

export async function suggestNextHints(input: {
  priorFindings: string[];
  planTitles: string[];
}): Promise<string[]> {
  const client = getClient();
  if (!client) return ["Continue one step", "Change direction", "Summarize for handoff"];
  const completion = await client.chat.completions.create({
    model: getModel(),
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Return JSON { "hints": string[3] }.
Each hint is a short plain-text instruction a human can click (max ~8 words).
NEVER use HTML, markdown links, <a>, href, #anchors, or URLs — plain words only.
Example: ["Check transaction logs", "Draft the fix", "Summarize and finish"]`,
      },
      { role: "user", content: JSON.stringify(input) },
    ],
  });
  const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as { hints?: string[] };
  const cleaned = (parsed.hints || [])
    .map((h) =>
      String(h)
        .replace(/<[^>]+>/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 3);
  return cleaned.length
    ? cleaned
    : ["Continue one step", "Change direction", "Summarize and finish"];
}
