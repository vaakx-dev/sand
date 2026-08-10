import type { ExtensionManifest } from "./extension.ts";
import type { JsonObject } from "./json.ts";
import type { RuntimeClient } from "./runtime.ts";

export interface UiReadable<T> {
  get(): T;
}

export type UiValue<T> = T | (() => T) | UiReadable<T>;

export type UiIconButtonVariant =
  | "standard"
  | "compact"
  | "tiny"
  | "dense"
  | "round"
  | "window"
  | "rail";

export interface UiIconButtonOptions {
  label: UiValue<string>;
  renderIcon(size: number): HTMLElement;
  onClick(event: MouseEvent): void;
  variant?: UiIconButtonVariant;
  className?: string | string[];
  selected?: UiValue<boolean>;
  disabled?: UiValue<boolean>;
  hidden?: UiValue<boolean>;
  tooltip?: UiValue<string> | false;
}

export interface UiControls {
  iconButton(options: UiIconButtonOptions): HTMLButtonElement;
}

export interface UiCommand {
  id: string;
  label: string;
  detail?: string;
  keybinding?: string;
  run(): void | Promise<void>;
}

export interface UiCommandRegistry {
  register(command: UiCommand): () => void;
  list(): UiCommand[];
  subscribe(listener: () => void): () => void;
  execute(id: string): Promise<void>;
}

export interface UiSlotContribution {
  id: string;
  slot: string;
  node: HTMLElement;
  order?: number;
}

export interface UiSlotRegistry {
  register(contribution: UiSlotContribution): () => void;
  mount(slot: string, container: HTMLElement): () => void;
}

export interface UiSurfaceContribution {
  id: string;
  label: string;
  description: string;
  order?: number;
  multiple?: boolean;
  available?(): boolean;
  renderIcon(size: number): HTMLElement;
  renderActions?(instance: UiSurfaceInstance): HTMLElement;
  render?(instance: UiSurfaceInstance): HTMLElement;
  open?(): void | Promise<void>;
}

export interface UiSurfaceVisibility {
  get(): boolean;
  subscribe(listener: (visible: boolean) => void): () => void;
}

export interface UiSurfaceInstance {
  id: string;
  visibility: UiSurfaceVisibility;
}

export interface UiSurfaceRegistry {
  register(surface: UiSurfaceContribution): () => void;
  list(): UiSurfaceContribution[];
  refresh(): void;
  subscribe(listener: () => void): () => void;
  open(id: string): Promise<void>;
  onOpen(listener: (surface: UiSurfaceContribution) => void): () => void;
}

export interface UiEvent<T = unknown> {
  kind: string;
  payload: T;
}

export interface UiEventRegistry {
  emit<T = unknown>(kind: string, payload: T): void;
  subscribe(listener: (event: UiEvent) => void): () => void;
}

export interface UiToolPresentation {
  name: string;
  label: string;
  renderIcon(size: number): HTMLElement;
  preview?(input: JsonObject): string;
}

export interface UiToolRegistry {
  register(presentation: UiToolPresentation): () => void;
  get(name: string): UiToolPresentation | undefined;
  subscribe(listener: () => void): () => void;
}

export interface UiRegistry {
  mount(node: HTMLElement): void;
  controls: UiControls;
  commands: UiCommandRegistry;
  slots: UiSlotRegistry;
  surfaces: UiSurfaceRegistry;
  events: UiEventRegistry;
  tools: UiToolRegistry;
}

export interface UiExtensionContext {
  manifest: ExtensionManifest;
  runtime: RuntimeClient;
  ui: UiRegistry;
}

export interface UiExtension {
  activate(context: UiExtensionContext): void | Promise<void>;
}
