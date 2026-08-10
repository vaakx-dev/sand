import {
  objectValue,
  optionalString,
  requiredString,
  type AgentMessage,
  type JsonValue,
  type ThreadChangeRequestState,
} from "@sand/extension-api";

import { Registry } from "../extensions/registry.ts";
import { ThreadLifecycle } from "./lifecycle.ts";
import { ThreadStore } from "./store.ts";

export function registerThreadCommands(
  registry: Registry,
  lifecycle: ThreadLifecycle,
  threads: ThreadStore,
): void {
  registry.registerInternal("threads.get", (params) => {
    const id = requiredString(objectValue(params), "id");
    return structuredClone(threads.require(id)) as unknown as JsonValue;
  });
  registry.registerInternal("threads.create", async (params) => {
    const value = objectValue(params);
    const prompt = requiredString(value, "prompt");
    const thread = threads.create(
      prompt,
      requiredString(value, "provider"),
      requiredString(value, "model"),
    );
    thread.listed = value.listed !== false;
    thread.title = optionalString(value.title)?.trim() || thread.title;
    thread.messages = messages(value.messages);
    await threads.persist(thread, false);
    return structuredClone(thread) as unknown as JsonValue;
  });
  registry.registerInternal("threads.pin", (params) => {
    const value = objectValue(params);
    return lifecycle.pin(requiredString(value, "threadId"), Boolean(value.pinned));
  });
  registry.registerInternal("threads.pin.reorder", (params) => {
    const value = objectValue(params);
    return lifecycle.reorderPin(
      requiredString(value, "threadId"),
      optionalString(value.beforeId),
    );
  });
  registry.registerInternal("threads.settle", (params) => {
    const value = objectValue(params);
    return lifecycle.settle(requiredString(value, "threadId"), Boolean(value.settled));
  });
  registry.registerInternal("threads.rename", (params) => {
    const value = objectValue(params);
    return lifecycle.rename(
      requiredString(value, "threadId"),
      requiredString(value, "title"),
    );
  });
  registry.registerInternal("threads.unread", (params) => {
    const value = objectValue(params);
    return lifecycle.unread(requiredString(value, "threadId"), Boolean(value.unread));
  });
  registry.registerInternal("threads.snooze", (params) => {
    const value = objectValue(params);
    return lifecycle.snooze(
      requiredString(value, "threadId"),
      optionalString(value.until),
    );
  });
  registry.registerInternal("threads.visit", (params) =>
    lifecycle.visit(requiredString(objectValue(params), "threadId"))
  );
  registry.registerInternal("threads.changeRequest", (params) => {
    const value = objectValue(params);
    return lifecycle.changeRequest(
      requiredString(value, "threadId"),
      changeRequestState(optionalString(value.state)),
    );
  });
  registry.registerInternal("threads.delete", (params) =>
    lifecycle.delete(requiredString(objectValue(params), "threadId"))
  );
}

function messages(value: JsonValue | undefined): AgentMessage[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("messages must be an array");
  for (const message of value) {
    const item = objectValue(message);
    if (
      typeof item.id !== "string"
      || typeof item.content !== "string"
      || typeof item.createdAt !== "string"
      || !["system", "user", "assistant", "tool"].includes(String(item.role))
    ) {
      throw new Error("messages contains an invalid agent message");
    }
  }
  return structuredClone(value) as unknown as AgentMessage[];
}

function changeRequestState(value: string | undefined): ThreadChangeRequestState | undefined {
  if (!value) return undefined;
  if (value === "open" || value === "closed" || value === "merged") return value;
  throw new Error(`invalid change request state: ${value}`);
}
