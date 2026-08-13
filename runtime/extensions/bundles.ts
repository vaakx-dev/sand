import { resolve } from "node:path";
import type { BunPlugin } from "bun";

import { CoreModules } from "../modules.ts";
import type { Loaded } from "./discovery.ts";

export class Bundles {
  constructor(private readonly core: CoreModules) {}

  host(extension: Loaded, providers: Map<string, Loaded>): Promise<string> {
    return this.build(extension, extension.manifest.main!, "bun", providers);
  }

  ui(extension: Loaded, providers: Map<string, Loaded>): Promise<string> {
    return this.build(extension, extension.manifest.ui!, "browser", providers);
  }

  private async build(
    extension: Loaded,
    entry: string,
    target: "browser" | "bun",
    providers: Map<string, Loaded>,
  ): Promise<string> {
    const result = await Bun.build({
      entrypoints: [resolve(extension.root, entry)],
      target,
      format: "esm",
      packages: "bundle",
      minify: false,
      sourcemap: "inline",
      external: target === "browser" ? this.core.uiNames() : undefined,
      plugins: [
        ...(target === "bun" ? [this.core.hostPlugin()] : []),
        apiPlugin(extension, target === "bun" ? "host" : "ui", providers),
      ],
    });
    if (!result.success) {
      throw new Error(result.logs.map((log) => log.message).join("\n"));
    }
    const output = result.outputs.find((item) => item.path.endsWith(".js"));
    if (!output) throw new Error(`no JavaScript emitted for ${extension.manifest.id}`);
    return output.text();
  }
}

function apiPlugin(
  consumer: Loaded,
  target: "host" | "ui",
  providers: Map<string, Loaded>,
): BunPlugin {
  return {
    name: "sand-extension-apis",
    setup(build) {
      build.onResolve({ filter: /^sand:api\/[a-z0-9]+(?:[.-][a-z0-9]+)*$/u }, ({ path }) => {
        const name = path.slice("sand:api/".length);
        if (!consumer.manifest.uses?.includes(name)) {
          throw new Error(`${consumer.manifest.id} imports undeclared API: ${name}`);
        }
        const provider = providers.get(name);
        if (!provider) throw new Error(`API provider is unavailable: ${name}`);
        const contribution = provider.manifest.provides?.[name];
        if (!contribution || contribution.target !== target) {
          throw new Error(`API ${name} is not available for ${target}`);
        }
        return { path: resolve(provider.root, contribution.module) };
      });
    },
  };
}
