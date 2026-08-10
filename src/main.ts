import { errorMessage, type UiBundle } from "@sand/extension-api";

import { activate } from "./ui/extensions.ts";
import { createRegistry } from "./ui/registry.ts";
import { Client } from "./runtime.ts";

const desktop = "__TAURI_INTERNALS__" in window;
const runtime = new Client(desktop);
const { registry, mounted } = createRegistry();

if (desktop) void start();
else showFailure(new Error("the desktop runtime is required; start Sand through Tauri"));

async function start(): Promise<void> {
  try {
    const bundles = await runtime.call<UiBundle[]>("extensions.ui");
    const failures: string[] = [];
    for (const bundle of bundles) {
      try {
        await activate(bundle, runtime, registry);
      } catch (error) {
        const message = `${bundle.manifest.id}: ${errorMessage(error)}`;
        failures.push(message);
        console.error(`UI extension failed: ${message}`);
      }
    }
    if (!mounted()) {
      const detail = failures.length ? ` (${failures.join("; ")})` : "";
      throw new Error(`no enabled UI extension mounted a workbench${detail}`);
    }
  } catch (error) {
    showFailure(error);
  }
}

function showFailure(error: unknown): void {
  const root = document.getElementById("app");
  if (!root) return;
  root.textContent = `Sand could not start: ${errorMessage(error)}`;
  root.setAttribute(
    "style",
    "box-sizing:border-box;min-height:100vh;padding:32px;background:#111;color:#ddd;font:13px ui-monospace,monospace",
  );
}
