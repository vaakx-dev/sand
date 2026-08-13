import { derive, div, dynamicChild, span } from "@vaakx-dev/vrui";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { UiToolRegistry } from "../api.ts";
import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { composer } from "./agent/composer.ts";
import { conversationView } from "./agent/conversation.ts";
import { projectName } from "./format.ts";

const Agent = styled(div, {
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  background: "var(--background)",
});

const Welcome = styled(Agent, {
  display: "grid",
  placeItems: "center",
  padding: "var(--header-height) var(--space-content) 120px",
});

const WelcomeContent = styled(div, {
  width: "min(var(--content-width), 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "var(--space-page)",
});

const WelcomeTitle = styled(div, {
  color: "var(--text)",
  fontSize: "clamp(24px, 2vw, 32px)",
  fontWeight: "var(--weight-medium)",
  letterSpacing: "var(--tracking-tight)",
  textAlign: "center",
  "> span": { borderBottom: "1px dotted var(--border)" },
});

export function agentView(
  controller: WorkbenchController,
  state: WorkbenchState,
  tools: UiToolRegistry,
  ui: SandUi,
): HTMLElement {
  return dynamicChild(
    derive(() => state.threads.messages.get().length > 0 || Boolean(state.threads.delta.get())),
    (hasMessages) => hasMessages
      ? Agent({}, conversationView(state, tools), composer(controller, state, ui))
      : newThread(controller, state, ui),
  );
}

function newThread(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
): HTMLElement {
  return Welcome(
    {},
    WelcomeContent(
      {},
      WelcomeTitle(
        {},
        "What should we build in ",
        span(state.root.map(projectName)),
        "?",
      ),
      composer(controller, state, ui, true),
    ),
  );
}
