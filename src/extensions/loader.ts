import type {
  ExtensionApiRegistry,
  RuntimeClient,
  UiBundle,
  UiExtension,
} from "@sand/extension-api";

import { CoreModules } from "./modules.ts";

export async function activate(
  bundle: UiBundle,
  runtime: RuntimeClient,
  apis: ExtensionApiRegistry,
  mount: (node: HTMLElement) => void,
  core: CoreModules,
): Promise<void> {
  const source = core.link(bundle.source);
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  try {
    const imported = (await import(/* @vite-ignore */ url)) as {
      default?: UiExtension;
      activate?: UiExtension["activate"];
    };
    const extension = imported.default ?? imported;
    if (typeof extension.activate !== "function") {
      throw new Error(`${bundle.manifest.id} does not export activate()`);
    }
    await extension.activate({
      runtime,
      apis: apis.context(bundle.manifest, "ui", new Set(bundle.provided)),
      mount,
    });
  } catch (error) {
    apis.remove(bundle.manifest.id);
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
