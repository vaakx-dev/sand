import { derive, div, dynamicChild, span, type Sig } from "@vaakx-dev/vrui";

import type { AgentProviderOption } from "@sand/extension-api";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import { findModel } from "../../modelCatalog.ts";
import type { WorkbenchState } from "../../state.ts";
import type { GenerationPickerState, GenerationSelection } from "../generation.ts";

const SectionTitle = styled(span, { display: "block", padding: "var(--space-small) var(--space-medium)", color: "var(--muted)", fontSize: "var(--font-caption)" });
const Divider = styled(div, { margin: "var(--space-small) var(--space-compact)", borderTop: "1px solid var(--border)" });

export function traitsPicker(
  state: WorkbenchState,
  ui: SandUi,
  selection: GenerationSelection,
  picker: GenerationPickerState,
): HTMLElement {
  const model = derive(() => findModel(
    state.providerModels.get(),
    selection.provider.get(),
    selection.model.get(),
  ));
  return ui.popover(
    { width: 168, onDismiss: () => picker.traitsOpen.set(false) },
    dynamicChild(model, (selected) => selected
      ? div(
          {},
          ...optionSection(
            ui,
            "Reasoning",
            selected.reasoning,
            selected.defaultReasoning,
            selection.reasoning,
            selection.selectReasoning,
          ),
          selected.reasoning.length > 0
              && Boolean(selection.serviceTier)
              && selected.serviceTiers.length > 0
            ? Divider({})
            : null,
          ...(selection.serviceTier && selection.selectServiceTier
            ? optionSection(
                ui,
                "Service tier",
                selected.serviceTiers,
                selected.defaultServiceTier,
                selection.serviceTier,
                selection.selectServiceTier,
              )
            : []),
        )
      : div("No model options")),
  );
}

function optionSection(
  ui: SandUi,
  heading: string,
  options: AgentProviderOption[],
  defaultValue: string,
  selected: Sig<string>,
  select: (value: string) => void | Promise<void>,
): HTMLElement[] {
  if (options.length === 0) return [];
  return [
    SectionTitle({}, heading),
    ...options.map((option) => ui.listItem({
      label: option.label,
      detail: option.id === defaultValue ? ui.badge({ label: "Default" }) : undefined,
      selected: selected.map((value) => value === option.id),
      onClick: () => void select(option.id),
    })),
  ];
}
