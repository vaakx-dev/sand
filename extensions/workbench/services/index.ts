import type { WorkbenchService } from "../api.ts";
import { Commands } from "./commands.ts";
import { Events } from "./events.ts";
import { Providers } from "./providers.ts";
import { Slots } from "./slots.ts";
import { Surfaces } from "./surfaces.ts";
import { Tools } from "./tools.ts";

export function createWorkbenchService(): WorkbenchService {
  return {
    commands: new Commands(),
    slots: new Slots(),
    surfaces: new Surfaces(),
    events: new Events(),
    providers: new Providers(),
    tools: new Tools(),
  };
}
