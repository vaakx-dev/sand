import type { RuntimeClient } from "./runtime.ts";
import type { ExtensionApis } from "./apis.ts";

export interface UiExtensionContext {
  runtime: RuntimeClient;
  apis: ExtensionApis;
  mount(node: HTMLElement): void;
}

export interface UiExtension {
  activate(context: UiExtensionContext): void | Promise<void>;
}
