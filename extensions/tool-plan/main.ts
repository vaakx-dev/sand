import type { AgentTool, AgentToolExecution, HostExtension, JsonObject, JsonValue } from "@sand/extension-api";

const definition = {
  name: "update_plan",
  description: "Create or update the visible execution plan for the current coding task.",
  parameters: {
    type: "object",
    properties: {
      explanation: { type: "string", description: "Short reason for this plan or update." },
      plan: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step: { type: "string" },
            status: { type: "string", enum: ["pending", "in_progress", "completed"] },
          },
          required: ["step", "status"],
          additionalProperties: false,
        },
      },
    },
    required: ["plan"],
    additionalProperties: false,
  },
} as const;

const extension: HostExtension = {
  activate(context) {
    const tool: AgentTool = {
      definition: definition as unknown as AgentTool["definition"],
      async execute(input: JsonObject, _signal: AbortSignal, execution?: AgentToolExecution): Promise<JsonValue> {
        const plan = validatePlan(input.plan);
        const payload = {
          sessionId: execution?.sessionId ?? "",
          explanation: typeof input.explanation === "string" ? input.explanation : "",
          plan,
        };
        context.events.emit("agent.plan", payload);
        return payload;
      },
    };
    context.tools.register(tool);
  },
};

function validatePlan(value: JsonValue | undefined): { step: string; status: "pending" | "in_progress" | "completed" }[] {
  if (!Array.isArray(value)) throw new Error("plan must be an array");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("plan steps must be objects");
    const step = entry.step;
    const status = entry.status;
    if (typeof step !== "string" || !step.trim()) throw new Error("plan step text is required");
    if (status !== "pending" && status !== "in_progress" && status !== "completed") throw new Error("invalid plan status");
    return { step: step.trim(), status };
  });
}

export default extension;
