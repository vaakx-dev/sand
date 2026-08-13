import type { ExtensionApis, JsonObject } from "@sand/extension-api";

export const WORKBENCH_API = "workbench";

export const workbenchCommands = {
  newThread: "agent.new",
} as const;

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

export interface WorkbenchService {
  commands: UiCommandRegistry;
  slots: UiSlotRegistry;
  surfaces: UiSurfaceRegistry;
  events: UiEventRegistry;
  tools: UiToolRegistry;
}

export function useWorkbench(apis: ExtensionApis): WorkbenchService {
  return apis.get<WorkbenchService>(WORKBENCH_API);
}

export const workbenchEvents = {
  activityChanged: "workbench.activity.changed",
  newThreadSelected: "agent.new.selected",
  threadChanged: "workbench.thread.changed",
} as const;

export const workbenchSlots = {
  auxiliary: "workbench.auxiliary",
  bottom: "workbench.bottom",
  layoutActions: "workbench.layout.actions",
  overlays: "workbench.overlays",
  sidebarProjects: "workbench.sidebar.projects",
  topbarActions: "workbench.topbar.actions",
} as const;
