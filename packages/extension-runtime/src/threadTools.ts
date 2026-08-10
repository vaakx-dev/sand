import {
  objectValue,
  type AgentToolDefinition,
  type HostExtensionContext,
  type JsonValue,
} from "@sand/extension-api";

export interface ThreadTool {
  definition: AgentToolDefinition;
  command: string;
}

export function registerThreadTools(
  context: HostExtensionContext,
  tools: ThreadTool[],
): void {
  for (const tool of tools) {
    context.tools.register({
      definition: tool.definition,
      execute(input, signal, execution) {
        if (!execution?.threadId) {
          throw new Error(`${tool.definition.name} requires an active thread`);
        }
        return context.commands.execute<JsonValue>(tool.command, {
          ...objectValue(input),
          sourceThreadId: execution.threadId,
        }, signal);
      },
    });
  }
}
