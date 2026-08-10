import { derive, div, dynamicChild, span } from "@vaakx-dev/vrui";

import type { UiControls, UiToolRegistry } from "@sand/extension-api";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { composer } from "./agent/composer.ts";
import { conversationView } from "./agent/conversation.ts";
import { projectName } from "./format.ts";

export function agentView(
  controller: WorkbenchController,
  state: WorkbenchState,
  tools: UiToolRegistry,
  controls: UiControls,
): HTMLElement {
  return dynamicChild(
    derive(() => state.threads.messages.get().length > 0 || Boolean(state.threads.delta.get())),
    (hasMessages) => hasMessages
      ? div(
          { class: "agent-view" },
          conversationView(state, tools),
          composer(controller, state, controls),
        )
      : newThread(controller, state, controls),
  );
}

function newThread(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
): HTMLElement {
  return div(
    { class: "agent-view new-thread" },
    div(
      { class: "new-thread-center" },
      div(
        { class: "new-thread-heading" },
        "What should we build in ",
        span(state.root.map(projectName)),
        "?",
      ),
      composer(controller, state, controls, true),
    ),
  );
}
