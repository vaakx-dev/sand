import {
  objectValue,
  optionalString,
  requiredString,
} from "@sand/extension-api";

import { Registry } from "../extensions/registry.ts";
import { ExecutionCoordinator } from "./coordinator.ts";

export function registerExecutionCommands(
  registry: Registry,
  execution: ExecutionCoordinator,
): void {
  registry.registerInternal("agent.run.start", (params) => {
    const value = objectValue(params);
    return execution.start({
      threadId: optionalString(value.threadId),
      prompt: requiredString(value, "prompt"),
      provider: optionalString(value.provider),
      model: optionalString(value.model),
    });
  });
  registry.registerInternal("agent.run.queue", (params) => {
    const value = objectValue(params);
    return execution.queue({
      threadId: requiredString(value, "threadId"),
      prompt: requiredString(value, "prompt"),
      provider: optionalString(value.provider),
      model: optionalString(value.model),
    });
  });
  registry.registerInternal("agent.run.steer", (params) => {
    const value = objectValue(params);
    return execution.steer({
      threadId: requiredString(value, "threadId"),
      prompt: requiredString(value, "prompt"),
    });
  });
  registry.registerInternal("agent.run.cancel", (params) =>
    execution.cancel(requiredString(objectValue(params), "threadId"))
  );
  registry.registerInternal("agent.run.recover", (params) =>
    execution.recover(requiredString(objectValue(params), "threadId"))
  );
}
