import type { UiRegistry } from "@sand/extension-api";

import { Commands } from "./commands.ts";
import { Controls } from "./controls.ts";
import { Events } from "./events.ts";
import { Slots } from "./slots.ts";
import { Surfaces } from "./surfaces.ts";
import { Tools } from "./tools.ts";

export function createRegistry(): { registry: UiRegistry; mounted: () => boolean } {
  let isMounted = false;
  const registry: UiRegistry = {
    mount(node) {
      if (isMounted) throw new Error("a UI extension already mounted the application root");
      const root = document.getElementById("app");
      if (!root) throw new Error("application root is missing");
      root.replaceChildren(node);
      isMounted = true;
    },
    controls: new Controls(),
    commands: new Commands(),
    slots: new Slots(),
    surfaces: new Surfaces(),
    events: new Events(),
    tools: new Tools(),
  };
  return { registry, mounted: () => isMounted };
}
