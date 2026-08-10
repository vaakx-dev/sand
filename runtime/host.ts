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
const agent = new AgentHarness(registry, settings, events, join(workspace, ".sand", "sessions"));
await agent.load();

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
    case "agent.providers":
      return agent.providers();
    case "agent.tools":
      return agent.tools();
    case "agent.tool":
      return agent.tool(requiredString(object, "name"), objectValue(object.input ?? null));
    case "agent.sessions":
      return agent.sessionsList();
    case "agent.session":
      return agent.session(requiredString(object, "id"));
    case "agent.start":
      return agent.start({
        prompt: requiredString(object, "prompt"),
        provider: optionalString(object.provider),
        model: optionalString(object.model),
        sessionId: optionalString(object.sessionId),
        maxSteps: optionalNumber(object.maxSteps),
      });
    case "agent.cancel":
      return agent.cancel(requiredString(object, "session_id"));
    case "agent.pin":
      return agent.pin(requiredString(object, "session_id"), Boolean(object.pinned));
    case "agent.pin.reorder":
      return agent.reorderPin(
        requiredString(object, "session_id"),
        optionalString(object.beforeId),
      );
    case "agent.settle":
      return agent.settle(requiredString(object, "session_id"), Boolean(object.settled));
    case "agent.rename":
      return agent.rename(requiredString(object, "session_id"), requiredString(object, "title"));
    case "agent.unread":
      return agent.unread(requiredString(object, "session_id"), Boolean(object.unread));
    case "agent.snooze":
      return agent.snooze(requiredString(object, "session_id"), optionalString(object.until));
    case "agent.visit":
      return agent.visit(requiredString(object, "session_id"));
    case "agent.changeRequest":
      return agent.changeRequest(
        requiredString(object, "session_id"),
        changeRequestState(optionalString(object.state)),
      );
    case "agent.delete":
      return agent.delete(requiredString(object, "session_id"));
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
