import type { HostExtension } from "@sand/extension-api";

const extension: HostExtension = {
  activate(context) {
    context.providers.register({
      id: "echo",
      name: "Echo",
      defaultModel: "local",
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
