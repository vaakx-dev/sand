import {
  button,
  derive,
  div,
  dynamicChild,
  icon,
  show,
  sig,
  span,
  type Sig,
} from "@vaakx-dev/vrui";
import { ChevronDown } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { WorkbenchController } from "../controller.ts";
import { findModel, findProvider, modelName, optionLabel } from "../modelCatalog.ts";
import type { WorkbenchState } from "../state.ts";
import { modelPicker } from "./agent/modelPicker.ts";
import { traitsPicker } from "./agent/traitsPicker.ts";
import { providerIcon } from "./shared/providerIcon.ts";

export interface GenerationSelection {
  provider: Sig<string>;
  model: Sig<string>;
  reasoning: Sig<string>;
  serviceTier?: Sig<string>;
  selectModel(provider: string, model: string): void | Promise<void>;
  selectReasoning(value: string): void | Promise<void>;
  selectServiceTier?(value: string): void | Promise<void>;
}

export interface GenerationPickerState {
  modelOpen: Sig<boolean>;
  traitsOpen: Sig<boolean>;
  query: Sig<string>;
  index: Sig<number>;
  source: Sig<string>;
}

const Controls = styled(div, {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-compact)",
});

const Anchor = styled(div, { position: "relative", minWidth: 0, flex: "0 1 auto" });

const Chip = styled(button, {
  height: "var(--control-height)",
  minWidth: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-small)",
  padding: "0 var(--space-medium)",
  borderRadius: "var(--control-radius)",
  color: "var(--muted)",
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontSize: "var(--font-small)",
  "&:hover": { color: "var(--text)", background: "var(--surface)" },
  "&[aria-expanded=true]": { color: "var(--text)", background: "var(--elevated)" },
});

const ModelChip = styled(Chip, { maxWidth: 176 });
const ModelLabel = styled(span, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export function createGenerationPickerState(): GenerationPickerState {
  return {
    modelOpen: sig(false),
    traitsOpen: sig(false),
    query: sig(""),
    index: sig(0),
    source: sig("favorites"),
  };
}

export function generationControl(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
  selection: GenerationSelection,
  picker: GenerationPickerState,
  beforeOpen?: () => void,
): HTMLElement {
  const selectedModel = derive(() => findModel(
    state.providerModels.get(),
    selection.provider.get(),
    selection.model.get(),
  ));
  const traitsAvailable = selectedModel.map((model) => Boolean(
    model
      && (model.reasoning.length > 0
        || Boolean(selection.serviceTier && model.serviceTiers.length > 0)),
  ));
  const traitsLabel = derive(() => {
    const model = selectedModel.get();
    if (!model) return "";
    return [
      optionLabel(model.reasoning, selection.reasoning.get()),
      selection.serviceTier
        ? optionLabel(model.serviceTiers, selection.serviceTier.get())
        : "",
    ].filter(Boolean).join(" / ");
  });

  return Controls(
    {},
    Anchor(
      {
        style: {
          zIndex: picker.modelOpen.map((open) => open ? "var(--z-menu)" : "auto"),
        },
      },
      ModelChip(
        {
          "aria-expanded": picker.modelOpen,
          onClick: () => {
            beforeOpen?.();
            picker.traitsOpen.set(false);
            picker.index.set(0);
            picker.modelOpen.toggle()();
          },
        },
        dynamicChild(selection.provider, (provider) => providerIcon(
          findProvider(state.providers.get(), provider),
          ui.tokens.size.iconCompact,
        )),
        ModelLabel({}, selectedModel.map((model) => modelName(model, selection.model.get()))),
        icon(ChevronDown, ui.tokens.size.iconTiny),
      ),
      show(picker.modelOpen, () => modelPicker(controller, state, ui, selection, picker)),
    ),
    show(traitsAvailable, () => Anchor(
      {},
      Chip(
        {
          "aria-expanded": picker.traitsOpen,
          onClick: () => {
            beforeOpen?.();
            picker.modelOpen.set(false);
            picker.traitsOpen.toggle()();
          },
        },
        traitsLabel,
        icon(ChevronDown, ui.tokens.size.iconTiny),
      ),
      show(picker.traitsOpen, () => traitsPicker(state, ui, selection, picker)),
    )),
  );
}
