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
  cancelStepIds?: string[];
  gateDescription?: string;
};

export async function runStepWithLlm(input: {
  roomTitle: string;
  templateId: string;
  stepTitle: string;
  priorFindings: string[];
  steers: string[];
}): Promise<StepResult> {
  const client = getClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const scenario =
    input.templateId === "failing-test"
      ? "CI unit test is red on checkout after a promo-code change."
      : input.templateId === "incident-reply"
        ? "Checkout errors spiked after a deploy; draft a careful customer update."
        : "Production checkout returns 500 intermittently for guest checkouts. Suspected null tax/total.";

  const completion = await client.chat.completions.create({
    model: getModel(),
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an engineering agent working inside a shared multiplayer Room.
You investigate and act step-by-step. Be concrete and useful — real commands, code snippets, SQL, diffs, PR text.
Never claim you cannot access systems; simulate grounded engineering work for the scenario.
Return ONLY JSON with keys:
tool (short tool name like logs.query, code.search, db.query, patch.draft, test.run, git.open_pr, summary.write, agent.think),
detail (what you ran or looked at),
result (the useful output — can be multi-line),
thinking (1 short sentence of intent),
cancelStepIds (optional string[] of later plan step titles to cancel based on human steers),
gateDescription (optional — if this step needs human approval, explain what you want to do).`,
      },
      {
        role: "user",
        content: JSON.stringify({
          roomTitle: input.roomTitle,
          scenario,
          currentStep: input.stepTitle,
          priorFindings: input.priorFindings,
          humanSteers: input.steers,
          instruction:
            "Execute ONLY the current step. Respect human steers (e.g. skip PR, rewrite PR body, hand context to teammate). If steers say skip opening a PR, set cancelStepIds including that step title.",
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as Partial<StepResult>;
  return {
    tool: parsed.tool || "agent.think",
    detail: parsed.detail || input.stepTitle,
    result: parsed.result || "No output",
    thinking: parsed.thinking,
    cancelStepIds: parsed.cancelStepIds,
    gateDescription: parsed.gateDescription,
  };
}

export async function reactToSteerWithLlm(input: {
  roomTitle: string;
  steers: string[];
  planTitles: string[];
  priorFindings: string[];
}): Promise<{ note: string; cancelStepIds?: string[]; reply: string }> {
  const client = getClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const completion = await client.chat.completions.create({
    model: getModel(),
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are the Room agent. A human just steered you mid-run.
Return JSON: reply (what you'll do now, 2-4 sentences), note (short timeline note), cancelStepIds (optional plan step titles to cancel).`,
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as { reply?: string; note?: string; cancelStepIds?: string[] };
  return {
    reply: parsed.reply || "Acknowledged.",
    note: parsed.note || parsed.reply || "Steer applied",
    cancelStepIds: parsed.cancelStepIds,
  };
}
