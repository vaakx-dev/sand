import {
  button,
  div,
  dynamicChild,
  icon,
  show,
  span,
  type Sig,
} from "@vaakx-dev/vrui";
import { ChevronDown, ChevronRight } from "lucide";

import type {
  AgentProviderConnection,
  AgentProviderConnectionState,
  UiControls,
} from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import type { ProviderDescription } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { providerModels } from "./providerModels.ts";
import { page } from "./shared.ts";

const AVAILABLE: AgentProviderConnectionState = {
  available: true,
  label: "Available",
  description: "This provider is ready to use.",
};

export function providersPage(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
): HTMLElement {
  return page(
    "Providers",
    dynamicChild(state.providers, (providers) => div(
      { class: "provider-list" },
      ...providers.map((provider) => providerCard(controller, state, controls, provider)),
    )),
  );
}

function providerCard(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
  provider: ProviderDescription,
): HTMLElement {
  const open = state.providerSections.map((sections) => sections[provider.id] ?? false);
  const connection = provider.presentation?.connection;
  const status = state.providerConnections.map((states) => states[provider.id] ?? AVAILABLE);

  return div(
    { class: "provider-settings-card" },
    button(
      {
        class: "provider-settings-header",
        "aria-expanded": open,
        onClick: () => controller.models.toggleProvider(provider.id),
      },
      span({ class: ["provider-dot", { available: status.map((value) => value.available) }] }),
      span({ class: "provider-name" }, provider.name),
      span({ class: "provider-version" }, provider.id),
      span({ class: "provider-state" }, status.map((value) => value.label)),
      dynamicChild(open, (value) => icon(value ? ChevronDown : ChevronRight, 14)),
    ),
    show(open, () => div(
      { class: "provider-settings-body" },
      connection
        ? connectionControls(controller, state, provider.id, connection, status)
        : span(
            { class: "provider-description provider-static-description" },
            provider.presentation?.description || AVAILABLE.description,
          ),
      providerModels(controller, state, controls, provider),
    )),
  );
}

function connectionControls(
  controller: WorkbenchController,
  state: WorkbenchState,
  provider: string,
  connection: AgentProviderConnection,
  status: Sig<AgentProviderConnectionState>,
): HTMLElement {
  const busy = state.providerConnectionBusy.map((states) => states[provider] ?? false);
  return div(
    { class: "provider-connection" },
    span({ class: "provider-description" }, status.map((value) => value.description)),
    dynamicChild(status, (value) => value.available
      ? button(
          {
            class: "secondary-button",
            disabled: busy,
            onClick: () => void controller.providers.disconnect(provider),
          },
          connection.disconnectLabel,
        )
      : button(
          {
            class: "primary-button",
            disabled: busy,
            onClick: () => void controller.providers.connect(provider),
          },
          busy.map((value) => value ? connection.connectingLabel : connection.connectLabel),
        )),
  );
}
