import {
  button,
  derive,
  div,
  dynamicChild,
  icon,
  show,
  span,
} from "@vaakx-dev/vrui";
import { ChevronDown, ChevronRight } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { ProviderDescription } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { providerModels } from "./providerModels.ts";
import { page } from "./shared.ts";

export function providersPage(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return page(
    "Providers",
    dynamicChild(state.providers, (providers) => div(
      { class: "provider-list" },
      ...providers.map((provider) => providerCard(controller, state, provider)),
    )),
  );
}

function providerCard(
  controller: WorkbenchController,
  state: WorkbenchState,
  provider: ProviderDescription,
): HTMLElement {
  const open = state.providerSections.map((sections) => sections[provider.id] ?? false);
  const connected = provider.id === "chatgpt"
    ? state.chatgptAuth.prop("authenticated")
    : derive(() => true);

  return div(
    { class: "provider-settings-card" },
    button(
      {
        class: "provider-settings-header",
        "aria-expanded": open,
        onClick: () => controller.models.toggleProvider(provider.id),
      },
      span({ class: ["provider-dot", { connected }] }),
      span({ class: "provider-name" }, provider.name),
      span({ class: "provider-version" }, provider.id),
      span(
        { class: ["auth-state", { connected }] },
        connected.map((value) => value ? "Available" : "Signed out"),
      ),
      dynamicChild(open, (value) => icon(value ? ChevronDown : ChevronRight, 14)),
    ),
    show(open, () => div(
      { class: "provider-settings-body" },
      provider.id === "chatgpt" ? chatgptAuth(controller, state) : span(
        { class: "provider-description" },
        "This provider is supplied by a host extension and runs locally without credentials.",
      ),
      providerModels(controller, state, provider),
    )),
  );
}

function chatgptAuth(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "provider-auth" },
    span(
      { class: "provider-description" },
      state.chatgptAuth.map((auth) => auth.authenticated
        ? `Connected to ChatGPT account ${auth.accountId.slice(0, 10)}… Tokens refresh automatically.`
        : "Browser sign-in uses Codex access from an eligible ChatGPT subscription. No API key is used."),
    ),
    dynamicChild(state.chatgptAuth, (auth) => auth.authenticated
      ? button(
          { class: "secondary-button", onClick: () => void controller.agent.logout() },
          "Sign out",
        )
      : button(
          {
            class: "primary-button",
            disabled: state.authBusy,
            onClick: () => void controller.agent.login(),
          },
          state.authBusy.map((busy) => busy ? "Waiting for browser…" : "Sign in with ChatGPT"),
        )),
  );
}
