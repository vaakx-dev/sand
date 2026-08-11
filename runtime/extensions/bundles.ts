import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CoreModules } from "../modules.ts";
import type { Loaded } from "./discovery.ts";

export class Bundles {
  constructor(private readonly core: CoreModules) {}

  host(extension: Loaded): Promise<string> {
    return this.build(extension, extension.manifest.main!, "bun");
  }

  ui(extension: Loaded): Promise<string> {
    return this.build(extension, extension.manifest.ui!, "browser");
  }

  async styles(extension: Loaded): Promise<string[]> {
    const entries = extension.manifest.styles ?? [];
    return Promise.all(
      entries.map((entry) => readFile(resolve(extension.root, entry), "utf8")),
    );
  }

  private async build(
    extension: Loaded,
    entry: string,
    target: "browser" | "bun",
  ): Promise<string> {
    const result = await Bun.build({
      entrypoints: [resolve(extension.root, entry)],
      target,
      format: "esm",
      packages: "bundle",
      minify: false,
      sourcemap: "inline",
      external: target === "browser" ? this.core.uiNames() : undefined,
      plugins: target === "bun" ? [this.core.hostPlugin()] : undefined,
    });
    if (!result.success) {
      throw new Error(result.logs.map((log) => log.message).join("\n"));
    }
    const output = result.outputs.find((item) => item.path.endsWith(".js"));
    if (!output) throw new Error(`no JavaScript emitted for ${extension.manifest.id}`);
    return output.text();
  }
}
