import { button, derive, div, dynamicChild, icon, input, onRaf, span, stop } from "@vaakx-dev/vrui";
import { Search, Star } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { openaiIcon } from "./icons.ts";
import { closeOnOutside } from "./popover.ts";

export function modelPicker(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const visibleModels = derive(() => {
    const source = state.modelSource.get();
    const query = state.modelQuery.get().trim().toLowerCase();
    const provider = source === "favorites" ? state.provider.get() : source;
    const models = state.providerModels.get()[provider] ?? [];
    const selected = source === "favorites"
      ? models.filter((model) => model.favorite && !model.hidden)
      : models.filter((model) => !model.hidden);
    return selected
      .map((model) => model.slug)
      .filter((model) => !query || model.toLowerCase().includes(query));
  });
  const choose = (model: string) => {
    const source = state.modelSource.get();
    const provider = source === "favorites" ? state.provider.get() : source;
    void controller.agent.selectModel(provider, model);
  };
  const move = (amount: number) => {
    const last = Math.max(0, visibleModels.get().length - 1);
    state.modelIndex.set(Math.min(last, Math.max(0, state.modelIndex.get() + amount)));
  };

  return div(
    {
      class: "composer-popover-layer",
      onMount: (element) => closeOnOutside(
        element,
        () => state.modelPickerOpen.set(false),
      ),
    },
    div(
      { class: "model-picker composer-popover", onClick: stop },
      div(
        { class: "model-picker-rail" },
        button(
          {
            class: ["model-rail-button favorite", {
              active: state.modelSource.map((value) => value === "favorites"),
            }],
            "aria-label": "Favorites",
            onClick: () => {
              state.modelSource.set("favorites");
              state.modelIndex.set(0);
            },
          },
          icon(Star, 18),
        ),
        div({ class: "model-rail-divider" }),
        ...state.providers.get().map((provider) => button(
          {
            class: ["model-rail-button", {
              active: state.modelSource.map((value) => value === provider.id),
            }],
            "aria-label": provider.name,
            onClick: () => {
              state.modelSource.set(provider.id);
              state.modelIndex.set(0);
            },
          },
          openaiIcon(18),
        )),
      ),
      div(
        { class: "model-picker-main" },
        div(
          { class: "model-search" },
          icon(Search, 15),
          input({
            class: "model-search-input",
            bindValue: state.modelQuery,
            placeholder: "Search models...",
            onMount: (element) => onRaf(() => element.focus()),
            onInput: () => state.modelIndex.set(0),
            onKeyDown: (event) => {
              if (event.key === "Escape") state.modelPickerOpen.set(false);
              if (event.key === "ArrowDown") {
                event.preventDefault();
                move(1);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
              }
              if (event.key === "Enter") {
                const model = visibleModels.get()[state.modelIndex.get()];
                if (model) choose(model);
              }
              if ((event.ctrlKey || event.metaKey) && /^[1-5]$/.test(event.key)) {
                const model = visibleModels.get()[Number(event.key) - 1];
                if (model) choose(model);
              }
            },
          }),
        ),
        dynamicChild(visibleModels, (models) => div(
          { class: "model-list-picker" },
          ...models.map((model, index) => modelRow(
            controller,
            state,
            currentProvider(state),
            model,
            index,
            choose,
          )),
          models.length === 0 ? div({ class: "model-picker-empty" }, "No matching models") : null,
        )),
      ),
    ),
  );
}

function modelRow(
  controller: WorkbenchController,
  state: WorkbenchState,
  provider: string,
  model: string,
  index: number,
  choose: (model: string) => void,
): HTMLElement {
  const favorite = state.providerModels.map((catalog) =>
    catalog[provider]?.find((item) => item.slug === model)?.favorite ?? false
  );
  return div(
    {
      class: ["model-picker-row", {
        selected: state.model.map((value) => value === model),
        highlighted: state.modelIndex.map((value) => value === index),
      }],
      role: "option",
      tabIndex: 0,
      onClick: () => choose(model),
      onMouseEnter: () => state.modelIndex.set(index),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose(model);
        }
      },
    },
    div(
      { class: "model-picker-copy" },
      span({ class: "model-picker-name" }, modelLabel(model)),
      span({ class: "model-picker-provider" }, openaiIcon(11), "ChatGPT subscription"),
    ),
    index < 5 ? span({ class: "model-shortcut" }, `Ctrl+${index + 1}`) : null,
    button(
      {
        class: ["model-favorite", { active: favorite }],
        "aria-label": favorite.map((value) => value ? "Remove from favorites" : "Add to favorites"),
        onClick: (event) => {
          event.stopPropagation();
          void controller.models.favorite(provider, model);
        },
      },
      icon(Star, 14),
    ),
  );
}

function currentProvider(state: WorkbenchState): string {
  const source = state.modelSource.get();
  return source === "favorites" ? state.provider.get() : source;
}

function modelLabel(model: string): string {
  return model
    .split("-")
    .map((part) => part === "gpt" ? "GPT" : part[0]!.toUpperCase() + part.slice(1))
    .join("-");
}
