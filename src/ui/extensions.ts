import type { RuntimeClient, UiBundle, UiExtension, UiRegistry } from "@sand/extension-api";

export async function activate(
  bundle: UiBundle,
  runtime: RuntimeClient,
  ui: UiRegistry,
): Promise<void> {
  installStyles(bundle);
  if (!bundle.source) return;
  const url = URL.createObjectURL(new Blob([bundle.source], { type: "text/javascript" }));
  try {
    const imported = (await import(/* @vite-ignore */ url)) as {
      default?: UiExtension;
      activate?: UiExtension["activate"];
    };
    const extension = imported.default ?? imported;
    if (typeof extension.activate !== "function") {
      throw new Error(`${bundle.manifest.id} does not export activate()`);
    }
    await extension.activate({ manifest: bundle.manifest, runtime, ui });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function installStyles(bundle: UiBundle): void {
  for (const source of bundle.styles) {
    const style = document.createElement("style");
    style.dataset.sandExtension = bundle.manifest.id;
    style.textContent = source;
    document.head.append(style);
  }
}
