import {
  errorMessage,
  ExtensionApiRegistry,
  type UiBundle,
} from "@sand/extension-api";

import { Client } from "./runtime.ts";
import { activate } from "./extensions/loader.ts";
import { CoreModules } from "./extensions/modules.ts";
import { createRoot } from "./root.ts";

const desktop = "__TAURI_INTERNALS__" in window;
const runtime = new Client();
const core = new CoreModules();
const apis = new ExtensionApiRegistry();
const root = createRoot();

if (desktop) void start();
else showFailure(new Error("the desktop runtime is required; start Sand through Tauri"));

async function start(): Promise<void> {
  try {
    await runtime.start();
    const bundles = await runtime.call<UiBundle[]>("extensions.ui");
    const uiExtensions = new Set(bundles.map((bundle) => bundle.manifest.id));
    const active = new Set<string>();
    const failures: string[] = [];
    for (const bundle of bundles) {
      const unavailable = Object.entries(bundle.bindings).find(([, provider]) => (
        !uiExtensions.has(provider) || !active.has(provider)
      ));
      if (unavailable) {
        failures.push(`${bundle.manifest.id}: required API is unavailable: ${unavailable[0]}`);
        continue;
      }
      try {
        await activate(bundle, runtime, apis, root.mount, core);
        active.add(bundle.manifest.id);
      } catch (error) {
        const message = `${bundle.manifest.id}: ${errorMessage(error)}`;
        failures.push(message);
        console.error(`UI extension failed: ${message}`);
      }
    }
    if (!root.mounted()) {
      const detail = failures.length ? ` (${failures.join("; ")})` : "";
      throw new Error(`no enabled UI extension mounted the application${detail}`);
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
