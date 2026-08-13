import { button, div, dynamicChild, icon, span, type Sig } from "@vaakx-dev/vrui";
import { ChevronDown, ChevronRight } from "lucide";

import type {
  AgentProviderConnectionState,
} from "@sand/extension-api";
import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { ProviderConnection } from "../../api.ts";
import type { WorkbenchController } from "../../controller.ts";
import type { ProviderDescription } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { providerModels } from "./providerModels.ts";
import { page } from "./shared.ts";
import { providerIcon } from "../shared/providerIcon.ts";

const AVAILABLE: AgentProviderConnectionState = {
  available: true,
  label: "Available",
  description: "This provider is ready to use.",
};

const ProviderList = styled(div, { display: "flex", flexDirection: "column", gap: "var(--space-large)" });
const Provider = styled(div, {
  overflow: "hidden",
  border: "1px solid var(--border)",
  borderRadius: "var(--surface-radius)",
  background: "var(--surface)",
});

const ProviderHeader = styled(button, {
  width: "100%",
  minHeight: "var(--header-large)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-medium)",
  padding: "0 var(--space-large)",
  color: "var(--text)",
  cursor: "pointer",
  textAlign: "left",
  "&:hover": { background: "var(--elevated)" },
});

const Status = styled(span, {
  width: "var(--space-medium)",
  height: "var(--space-medium)",
  flex: "0 0 var(--space-medium)",
  borderRadius: "var(--radius-round)",
  background: "var(--warning)",
  "&[data-available=true]": { background: "var(--success)" },
});

const ProviderName = styled(span, { color: "var(--text)", fontWeight: "var(--weight-semibold)" });
const ProviderId = styled(span, { flex: 1, color: "var(--muted)", fontSize: "var(--font-caption)" });
const ProviderState = styled(span, { color: "var(--muted)", fontSize: "var(--font-caption)" });
const ProviderBody = styled(div, { padding: "0 var(--space-large) var(--space-large)" });
const Connection = styled(div, {
  minHeight: "var(--setting-height)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-content)",
});
const Description = styled(span, {
  maxWidth: "var(--copy-width)",
  color: "var(--muted)",
  fontSize: "var(--font-small)",
  lineHeight: "var(--line-body)",
});

export function providersPage(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
): HTMLElement {
  return page(
    ui,
    "Providers",
    dynamicChild(state.providers, (providers) => ProviderList(
      {},
      ...providers.map((provider) => providerCard(controller, state, ui, provider)),
    )),
  );
}

function providerCard(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
  provider: ProviderDescription,
): HTMLElement {
  const open = state.providerSections.map((sections) => sections[provider.id] ?? false);
  const connection = provider.connection;
  const status = state.providerConnections.map((states) => states[provider.id] ?? AVAILABLE);
  return Provider(
    {},
    ProviderHeader(
      {
        "aria-expanded": open,
        onClick: () => controller.models.toggleProvider(provider.id),
      },
      Status({ "data-available": status.map((value) => value.available) }),
      providerIcon(provider, ui.tokens.size.iconCompact),
      ProviderName({}, provider.name),
      ProviderId({}, provider.id),
      ProviderState({}, status.map((value) => value.label)),
      dynamicChild(open, (value) => icon(value ? ChevronDown : ChevronRight, ui.tokens.size.iconCompact)),
    ),
    dynamicChild(open, (visible) => visible
      ? ProviderBody(
          {},
          connection
            ? connectionControls(controller, state, ui, provider.id, connection, status)
            : Description({}, provider.presentation?.description || AVAILABLE.description),
          providerModels(controller, state, ui, provider),
        )
      : div({ hidden: true })),
  );
}

function connectionControls(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
  provider: string,
  connection: ProviderConnection,
  status: Sig<AgentProviderConnectionState>,
): HTMLElement {
  const busy = state.providerConnectionBusy.map((states) => states[provider] ?? false);
  return Connection(
    {},
    Description({}, status.map((value) => value.description)),
    dynamicChild(status, (value) => value.available
      ? ui.button(
          { disabled: busy, onClick: () => void controller.providers.disconnect(provider) },
          connection.disconnectLabel,
        )
      : ui.button(
          { variant: "primary", disabled: busy, onClick: () => void controller.providers.connect(provider) },
          busy.map((value) => value ? connection.connectingLabel : connection.connectLabel),
        )),
  );
}
