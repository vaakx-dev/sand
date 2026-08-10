import { join } from "node:path";
import { createInterface } from "node:readline";

import {
  errorMessage,
  objectValue,
  requiredString,
  type JsonValue,
} from "@sand/extension-api";

import { AgentHarness } from "./agent.ts";
import { Events } from "./events.ts";
import { Manager } from "./extensions/manager.ts";
import { Registry } from "./extensions/registry.ts";
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
const agent = new AgentHarness(registry, settings, events);
const extensions = new Manager(
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
      return (await registry.execute<JsonValue>(id, object.params ?? null)) ?? null;
    }
    case "threads.restore":
      agent.restore(params);
      events.emit("runtime.restored", null);
      return true;
    case "agent.providers":
      return agent.providers();
    case "agent.tools":
      return agent.tools();
    case "agent.tool.execute":
      return agent.tool(requiredString(object, "name"), objectValue(object.input ?? null));
  }
  if (registry.command(method)) return registry.execute<JsonValue>(method, params);
  throw new Error(`unknown runtime method: ${method}`);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
