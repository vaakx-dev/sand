import { button, derive, div, dynamicChild, icon, onRaf, span } from "@vaakx-dev/vrui";
import { Star } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { WorkbenchController } from "../../controller.ts";
import { findProvider, modelName } from "../../modelCatalog.ts";
import type { ProviderModel } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import type { GenerationPickerState, GenerationSelection } from "../generation.ts";
import { providerIcon } from "../shared/providerIcon.ts";

interface PickerModel {
  provider: string;
  model: ProviderModel;
}

const PICKER_WIDTH = 352;
const MAX_VISIBLE_MODELS = 5;

const Picker = styled(div, {
  maxHeight: "var(--popover-available-height)",
  display: "flex",
});
const Sources = styled(div, {
  width: "var(--header-height)",
  flex: "0 0 var(--header-height)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-compact)",
  padding: "var(--space-small)",
  borderRight: "1px solid var(--border)",
  background: "var(--panel)",
});
const Divider = styled(div, { margin: "var(--space-compact) 0", borderTop: "1px solid var(--border)" });
const SourceButton = styled(button, {
  width: "var(--control-large)",
  height: "var(--control-large)",
  display: "grid",
  placeItems: "center",
  flex: "none",
  borderRadius: "var(--control-radius)",
  color: "var(--muted)",
  cursor: "pointer",
  "&:hover:not([aria-pressed=true])": { color: "var(--text)", background: "var(--surface)" },
  "&[aria-pressed=true]": { color: "var(--text)", background: "var(--elevated)" },
});
const Main = styled(div, { minWidth: 0, flex: 1, display: "flex", flexDirection: "column" });
const Models = styled(div, {
  minHeight: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-compact)",
  overflowY: "auto",
  padding: "var(--space-small)",
  maxHeight: `calc(
    ${MAX_VISIBLE_MODELS} * var(--header-large)
    + ${MAX_VISIBLE_MODELS - 1} * var(--space-compact)
    + 2 * var(--space-small)
  )`,
});
const Model = styled(div, {
  width: "100%",
  minHeight: "var(--header-large)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-medium)",
  padding: "var(--space-medium)",
  borderRadius: "var(--row-radius)",
  color: "var(--text)",
  cursor: "pointer",
  "&:hover:not([aria-selected=true]), &[data-highlighted=true]:not([aria-selected=true])": {
    background: "var(--surface)",
  },
  "&[aria-selected=true]": { background: "var(--elevated)" },
});
const ModelCopy = styled(div, { minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-small)" });
const ModelName = styled(span, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--font-label)", fontWeight: "var(--weight-semibold)" });
const Provider = styled(span, { display: "flex", alignItems: "center", gap: "var(--space-small)", color: "var(--muted)", fontSize: "var(--font-caption)" });
const Empty = styled(div, { padding: "var(--header-height) var(--space-large)", color: "var(--muted)", textAlign: "center" });

export function modelPicker(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
  selection: GenerationSelection,
  picker: GenerationPickerState,
  anchor: HTMLElement,
): HTMLElement {
  const visibleModels = derive(() => {
    const source = picker.source.get();
    const query = picker.query.get().trim().toLowerCase();
    const catalog = state.providerModels.get();
    const models = source === "favorites"
      ? Object.entries(catalog).flatMap(([provider, entries]) => entries
          .filter((model) => model.favorite && !model.hidden)
          .map((model) => ({ provider, model })))
      : (catalog[source] ?? []).filter((model) => !model.hidden)
          .map((model) => ({ provider: source, model }));
    return models.filter(({ model }) => !query
      || model.slug.toLowerCase().includes(query)
      || model.name.toLowerCase().includes(query));
  });
  const choose = ({ provider, model }: PickerModel) => {
    picker.modelOpen.set(false);
    picker.query.set("");
    void selection.selectModel(provider, model.slug);
  };
  const move = (amount: number) => {
    const last = Math.max(0, visibleModels.get().length - 1);
    picker.index.set(Math.min(last, Math.max(0, picker.index.get() + amount)));
  };
  return ui.popover(
    {
      anchor,
      width: PICKER_WIDTH,
      padding: 0,
      onDismiss: () => picker.modelOpen.set(false),
    },
    Picker(
      {},
      Sources(
        {},
        sourceButton(ui, {
          label: "Favorites",
          selected: picker.source.map((value) => value === "favorites"),
          renderIcon: (size) => icon(Star, size),
          onClick: () => selectSource(picker, "favorites"),
        }),
        Divider({}),
        ...state.providers.get().map((provider) => sourceButton(ui, {
          label: provider.name,
          selected: picker.source.map((value) => value === provider.id),
          renderIcon: (size) => providerIcon(provider, size),
          onClick: () => selectSource(picker, provider.id),
        })),
      ),
      Main(
        {},
        ui.searchField({
          value: picker.query,
          label: "Search models",
          placeholder: "Search models...",
          size: "header",
          onMount: (element) => onRaf(() => element.focus()),
          onInput: () => picker.index.set(0),
          onKeyDown: (event) => pickerKeyDown(event, picker, visibleModels.get(), move, choose),
        }),
        dynamicChild(visibleModels, (models) => Models(
          {},
          ...models.map((entry, index) => modelRow(
            controller,
            state,
            selection,
            picker,
            entry,
            index,
            choose,
            ui,
          )),
          models.length === 0 ? Empty({}, "No matching models") : null,
        )),
      ),
    ),
  );
}

function modelRow(
  controller: WorkbenchController,
  state: WorkbenchState,
  selection: GenerationSelection,
  picker: GenerationPickerState,
  entry: PickerModel,
  index: number,
  choose: (model: PickerModel) => void,
  ui: SandUi,
): HTMLElement {
  const { provider, model } = entry;
  const description = findProvider(state.providers.get(), provider);
  const favorite = state.providerModels.map((catalog) =>
    catalog[provider]?.find((item) => item.slug === model.slug)?.favorite ?? false
  );
  return Model(
    {
      role: "option",
      tabIndex: 0,
      "aria-selected": derive(() =>
        selection.provider.get() === provider && selection.model.get() === model.slug
      ),
      "data-highlighted": picker.index.map((value) => value === index),
      onClick: () => choose(entry),
      onMouseEnter: () => picker.index.set(index),
      onMouseLeave: () => picker.index.set(-1),
    },
    ModelCopy(
      {},
      ModelName({}, modelName(model, model.slug)),
      Provider({}, providerIcon(description, ui.tokens.size.iconTiny), description?.name || provider),
    ),
    index < 5 ? ui.badge({ label: `Ctrl+${index + 1}` }) : null,
    ui.iconButton({
      label: favorite.map((value) => value ? "Remove from favorites" : "Add to favorites"),
      variant: "dense",
      selected: favorite,
      renderIcon: (size) => icon(Star, size),
      onClick: (event) => {
        event.stopPropagation();
        void controller.models.favorite(provider, model.slug);
      },
    }),
  );
}

function sourceButton(
  ui: SandUi,
  options: {
    label: string;
    selected: boolean | (() => boolean) | { get(): boolean };
    renderIcon(size: number): HTMLElement;
    onClick(): void;
  },
): HTMLButtonElement {
  let selected: boolean | (() => boolean);
  if (typeof options.selected === "object") {
    const reactive = options.selected;
    selected = () => reactive.get();
  } else {
    selected = options.selected;
  }
  return SourceButton(
    {
      type: "button",
      "aria-label": options.label,
      "aria-pressed": selected,
      onClick: options.onClick,
    },
    options.renderIcon(ui.tokens.size.icon),
  );
}

function pickerKeyDown(
  event: KeyboardEvent,
  picker: GenerationPickerState,
  models: PickerModel[],
  move: (amount: number) => void,
  choose: (model: PickerModel) => void,
): void {
  if (event.key === "Escape") picker.modelOpen.set(false);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    move(event.key === "ArrowDown" ? 1 : -1);
  }
  if (event.key === "Enter") {
    const selected = models[picker.index.get()];
    if (selected) choose(selected);
  }
  if ((event.ctrlKey || event.metaKey) && /^[1-5]$/u.test(event.key)) {
    const selected = models[Number(event.key) - 1];
    if (selected) choose(selected);
  }
}

function selectSource(picker: GenerationPickerState, source: string): void {
  picker.source.set(source);
  picker.index.set(0);
}
