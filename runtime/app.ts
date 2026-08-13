import { createInterface } from "node:readline";

import { errorMessage, type JsonValue } from "@sand/extension-api";

import type { ProtocolWriter } from "./events.ts";
import { CoreModules } from "./modules.ts";
import { WorkspaceManager } from "./workspaces/manager.ts";

interface RequestMessage {
  id: number;
  workspaceId?: string;
  method: string;
  params?: JsonValue;
}

const write: ProtocolWriter = (value) => {
  process.stdout.write(`${JSON.stringify(value)}\n`);
};

console.log = (...values: unknown[]) => console.error(...values);
console.info = (...values: unknown[]) => console.error(...values);

const appRoot = requiredEnv("SAND_APP_ROOT");
const home = requiredEnv("SAND_HOME");
const core = await CoreModules.load(appRoot);
core.install();
const workspaces = await WorkspaceManager.create({
  appRoot,
  home,
  core,
  builtinExtensions: requiredEnv("SAND_BUILTIN_EXTENSIONS"),
  write,
});

write({
  event: {
    kind: "runtime.ready",
    payload: { appRoot, home, bun: Bun.version },
  },
});

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  let request: RequestMessage | undefined;
  try {
    request = JSON.parse(line) as RequestMessage;
    const result = await dispatch(request);
    write({ id: request.id, result: result ?? null });
  } catch (error) {
    write({ id: request?.id, error: errorMessage(error) });
  }
}

function dispatch(request: RequestMessage): Promise<JsonValue> {
  const params = request.params ?? null;
  switch (request.method) {
    case "workspace.open":
      return workspaces.open(params);
    case "workspace.close":
      return workspaces.close(params);
    default:
      return workspaces.dispatch(request.workspaceId, request.method, params);
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
