import {
  button,
  div,
  dynamicChild,
  icon,
  span,
} from "@vaakx-dev/vrui";
import type { IconNode } from "@vaakx-dev/vrui";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Star } from "lucide";

import type { SandUi } from "sand:api/ui";

import type { WorkbenchController } from "../../controller.ts";
import type { ProviderDescription, ProviderModel } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { settingRow } from "./shared.ts";
import { styled } from "sand:api/ui";
import { tokens } from "sand:api/ui";

const Models = styled(div, { borderTop: "1px solid var(--border)" });
const Heading = styled(div, {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: tokens.space.section,
  padding: `${tokens.space.section}px ${tokens.space.medium}px ${tokens.space.medium}px`,
});
const Count = styled(span, { color: "var(--muted)", fontSize: tokens.font.small });
const ModelList = styled(div, { display: "flex", flexDirection: "column" });
const ModelRow = styled(div, {
  minHeight: tokens.size.header,
  display: "flex",
  alignItems: "center",
  gap: tokens.space.medium,
  borderTop: "1px solid var(--border)",
  "&[data-hidden=true]": { opacity: 0.55 },
});
const ModelCopy = styled(div, {
  minWidth: 0,
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: tokens.space.medium,
  overflow: "hidden",
});
const ModelName = styled(button, {
  minWidth: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  cursor: "pointer",
});
const ModelLabel = styled(span, { color: "var(--text)", fontSize: tokens.font.label });
const ModelSlug = styled(span, {
  maxWidth: "100%",
  overflow: "hidden",
  color: "var(--muted)",
  font: `${tokens.font.caption}px var(--mono)`,
  textOverflow: "ellipsis",
});
const HiddenLabel = styled(span, {
  color: "var(--muted)",
  fontSize: tokens.font.caption,
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
});
const ModelActions = styled(div, {
  flex: "0 0 auto",
  display: "grid",
  gridTemplateColumns: `repeat(4, ${tokens.size.control}px)`,
  gap: tokens.space.compact,
});
const AddRow = styled(div, {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: tokens.space.medium,
  paddingTop: tokens.space.large,
});

export function providerModels(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: SandUi,
  provider: ProviderDescription,
): HTMLElement {
  return Models(
    {},
    settingRow(
      controls,
      "New thread model",
      "Model selected when this provider becomes active.",
      dynamicChild(state.providerModels, (catalog) => {
        const models = (catalog[provider.id] ?? []).filter((model) => !model.hidden);
        const selected = state.provider.get() === provider.id
          ? state.model.get()
          : models[0]?.slug || provider.defaultModel;
        return controls.selectField({
            value: selected,
            options: models.map((model) => ({ value: model.slug, label: model.name })),
            onChange: (event) => void controller.selection.select(
              provider.id,
              (event.target as HTMLSelectElement).value,
            ),
          });
      }),
    ),
    Heading(
      {},
      span("Models"),
      Count(
        {},
        state.providerModels.map((catalog) => modelCount(catalog[provider.id] ?? [])),
      ),
    ),
    dynamicChild(state.providerModels, (catalog) => modelList(
      controller,
      controls,
      provider.id,
      catalog[provider.id] ?? [],
    )),
    modelAdd(controller, state, controls, provider),
  );
}

function modelList(
  controller: WorkbenchController,
  controls: SandUi,
  provider: string,
  models: ProviderModel[],
): HTMLElement {
  return ModelList(
    {},
    ...models.map((model, index) => ModelRow(
      { "data-hidden": model.hidden },
      ModelCopy(
        {},
        ModelName(
          {
            onClick: () => void controller.selection.select(provider, model.slug),
          },
          ModelLabel({}, model.name),
          ModelSlug({}, model.slug),
        ),
        model.hidden ? HiddenLabel({}, "Hidden") : null,
      ),
      ModelActions(
        {},
        ...modelActions(controller, provider, model, index, models.length).map((action) =>
          controls.iconButton({
            label: action.label,
            variant: "dense",
            selected: action.selected,
            disabled: action.disabled,
            renderIcon: (size) => icon(action.icon, size),
            onClick: action.run,
          })
        ),
      ),
    )),
  );
}

interface ModelAction {
  label: string;
  icon: IconNode;
  run: () => void;
  selected?: boolean;
  disabled?: boolean;
}

function modelActions(
  controller: WorkbenchController,
  provider: string,
  model: ProviderModel,
  index: number,
  count: number,
): ModelAction[] {
  return [
    {
      label: model.favorite ? "Remove favorite" : "Favorite model",
      icon: Star,
      run: () => void controller.models.favorite(provider, model.slug),
      selected: model.favorite,
    },
    {
      label: "Move model up",
      icon: ArrowUp,
      run: () => void controller.models.move(provider, model.slug, -1),
      disabled: index === 0,
    },
    {
      label: "Move model down",
      icon: ArrowDown,
      run: () => void controller.models.move(provider, model.slug, 1),
      disabled: index === count - 1,
    },
    {
      label: model.hidden ? "Show model" : "Hide model",
      icon: model.hidden ? Eye : EyeOff,
      run: () => void controller.models.hide(provider, model.slug),
    },
  ];
}

function modelAdd(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: SandUi,
  provider: ProviderDescription,
): HTMLElement {
  const value = state.providerModelInputs.map((inputs) => inputs[provider.id] ?? "");
  return AddRow(
    {},
    controls.textField({
      value,
      placeholder: "Model slug",
      "aria-label": `Add a model to ${provider.name}`,
      onInput: (event) => controller.models.setInput(
        provider.id,
        (event.target as HTMLInputElement).value,
      ),
      onKeyDown: (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        void controller.models.add(provider.id);
      },
    }),
    controls.button(
      {
        disabled: value.map((slug) => !slug.trim()),
        onClick: () => void controller.models.add(provider.id),
      },
      icon(Plus, controls.tokens.size.iconCompact),
      "Add",
    ),
  );
}

function modelCount(models: ProviderModel[]): string {
  const visible = models.filter((model) => !model.hidden).length;
  const total = models.length;
  return visible === total ? `${total} models available.` : `${visible} of ${total} models shown.`;
}
