import type { AgentModelTraits, HostExtension } from "@sand/extension-api";

const MODEL_TRAITS: AgentModelTraits = {
  reasoning: [],
  defaultReasoning: "",
  serviceTiers: [],
  defaultServiceTier: "",
};

const extension: HostExtension = {
  activate(context) {
    context.providers.register({
      id: "echo",
      name: "Echo",
      defaultModel: "local",
      modelDefaults: MODEL_TRAITS,
      models: [{
        slug: "local",
        name: "Local",
        ...MODEL_TRAITS,
      }],
      presentation: {
        description: "A local provider for checking the Sand agent harness without external credentials.",
      },
      async complete(request) {
        const last = [...request.messages].reverse().find((message) => message.role === "user");
        const content = last?.content
          ? `Extension host is ready. You said: ${last.content}`
          : "Extension host is ready.";
        request.onDelta(content);
        return { content, toolCalls: [] };
      },
    });
  },
};

export default extension;
