import { join } from "node:path";
import { createInterface } from "node:readline";

import {
  errorMessage,
  objectValue,
  optionalNumber,
  optionalString,
  requiredString,
  type JsonValue,
} from "@sand/extension-api";

import { AgentHarness } from "./agent.ts";
import { Events } from "./events.ts";
import { ExtensionManager } from "./extensions.ts";
import { Registry } from "./registry.ts";
import { Settings } from "./settings.ts";

interface RequestMessage {
  id: number;
  method: string;
  params?: JsonValue;
}

const protocolWrite = (value: object): void => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

console.log = (...values: unknown[]) => console.error(...values);
console.info = (...values: unknown[]) => console.error(...values);

const appRoot = requiredEnv("SAND_APP_ROOT");
const config = requiredEnv("SAND_CONFIG");
const workspace = requiredEnv("SAND_WORKSPACE");
const cache = requiredEnv("SAND_CACHE");
const settings = await Settings.load(join(workspace, ".sand", "settings.json"));
const events = new Events(protocolWrite);
const registry = new Registry(config, workspace, settings, events);
const extensions = new ExtensionManager(
  [
    { path: requiredEnv("SAND_BUILTIN_EXTENSIONS"), source: "builtin" },
    { path: requiredEnv("SAND_USER_EXTENSIONS"), source: "user" },
    { path: join(workspace, ".sand", "extensions"), source: "workspace" },
  ],
  cache,
  settings,
  registry,
);
await extensions.reload();
const agent = new AgentHarness(registry, settings, events);

events.emit("runtime.ready", {
  appRoot,
  workspace,
  bun: Bun.version,
  extensions: extensions.list().length,
});

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  let request: RequestMessage | undefined;
  try {
    request = JSON.parse(line) as RequestMessage;
    const result = await dispatch(request.method, request.params ?? null);
    protocolWrite({ id: request.id, result: result ?? null });
  } catch (error) {
    protocolWrite({
      id: request?.id,
      error: errorMessage(error),
    });
  }
}

async function dispatch(method: string, params: JsonValue): Promise<JsonValue> {
  const object = objectValue(params);
  switch (method) {
    case "runtime.info":
      return { appRoot, config, workspace, cache, bun: Bun.version };
    case "extensions.list":
      return extensions.list() as unknown as JsonValue;
    case "extensions.reload":
      return (await extensions.reload()) as unknown as JsonValue;
    case "extensions.ui":
      return (await extensions.uiBundles()) as unknown as JsonValue;
    case "settings.all":
      return settings.all();
    case "settings.set":
      await settings.set(requiredString(object, "key"), object.value ?? null);
      return settings.all();
    case "commands.execute": {
      const id = requiredString(object, "id");
      const command = registry.commands.get(id);
      if (!command) throw new Error(`unknown command: ${id}`);
      return (await command(object.params ?? null)) ?? null;
    }
    case "orchestration.restore":
      agent.restore(params);
      return true;
    case "orchestration.providers":
      return agent.providers();
    case "orchestration.tools":
      return agent.tools();
    case "orchestration.tool":
      return agent.tool(requiredString(object, "name"), objectValue(object.input ?? null));
    case "orchestration.start":
      return agent.start({
        prompt: requiredString(object, "prompt"),
        provider: optionalString(object.provider),
        model: optionalString(object.model),
        threadId: optionalString(object.threadId),
        maxSteps: optionalNumber(object.maxSteps),
      });
    case "orchestration.cancel":
      return agent.cancel(requiredString(object, "threadId"));
    case "orchestration.thread.pin":
      return agent.lifecycle.pin(requiredString(object, "threadId"), Boolean(object.pinned));
    case "orchestration.thread.pin.reorder":
      return agent.lifecycle.reorderPin(
        requiredString(object, "threadId"),
        optionalString(object.beforeId),
      );
    case "orchestration.thread.settle":
      return agent.lifecycle.settle(requiredString(object, "threadId"), Boolean(object.settled));
    case "orchestration.thread.rename":
      return agent.lifecycle.rename(
        requiredString(object, "threadId"),
        requiredString(object, "title"),
      );
    case "orchestration.thread.unread":
      return agent.lifecycle.unread(requiredString(object, "threadId"), Boolean(object.unread));
    case "orchestration.thread.snooze":
      return agent.lifecycle.snooze(
        requiredString(object, "threadId"),
        optionalString(object.until),
      );
    case "orchestration.thread.visit":
      return agent.lifecycle.visit(requiredString(object, "threadId"));
    case "orchestration.thread.changeRequest":
      return agent.lifecycle.changeRequest(
        requiredString(object, "threadId"),
        changeRequestState(optionalString(object.state)),
      );
    case "orchestration.thread.delete":
      return agent.lifecycle.delete(requiredString(object, "threadId"));
    default:
      throw new Error(`unknown runtime method: ${method}`);
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function changeRequestState(value: string | undefined): "open" | "closed" | "merged" | undefined {
  if (!value) return undefined;
  if (value === "open" || value === "closed" || value === "merged") return value;
  throw new Error(`invalid change request state: ${value}`);
}
