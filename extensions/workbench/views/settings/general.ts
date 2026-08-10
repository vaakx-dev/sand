import { derive, dynamicChild, h2, option, select } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../controller.ts";
import { findModel } from "../../modelCatalog.ts";
import type { WorkbenchState } from "../../state.ts";
import { page, settingRow } from "./shared.ts";

export function generalPage(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const titleModels = derive(() =>
    (state.providerModels.get()[state.titleProvider.get()] ?? []).filter((model) => !model.hidden)
  );
  const titleModel = derive(() => findModel(
    state.providerModels.get(),
    state.titleProvider.get(),
    state.titleModel.get(),
  ));

  return page(
    "General",
    settingRow(
      "Settle inactive threads",
      "Move quiet threads into the Settled shelf after the selected number of days.",
      select(
        {
          class: "settings-select",
          value: state.threads.autoSettleDays.map((days) => days === null ? "off" : String(days)),
          onChange: (event) => {
            const value = (event.target as HTMLSelectElement).value;
            state.threads.autoSettleDays.set(value === "off" ? null : Number(value));
            void controller.preferences.saveBehavior();
          },
        },
        option({ value: "off" }, "Off"),
        option({ value: "1" }, "After 1 day"),
        option({ value: "3" }, "After 3 days"),
        option({ value: "7" }, "After 7 days"),
        option({ value: "14" }, "After 14 days"),
        option({ value: "30" }, "After 30 days"),
      ),
    ),
    h2({ class: "settings-section-heading" }, "Text generation"),
    settingRow(
      "Provider",
      "Provider used for generated thread titles and other short application text.",
      dynamicChild(state.providers, (providers) => select(
        {
          class: "settings-select",
          value: state.titleProvider,
          onChange: (event) => void controller.models.titleProvider(
            (event.target as HTMLSelectElement).value,
          ),
        },
        ...providers.map((provider) => option({ value: provider.id }, provider.name)),
      )),
    ),
    settingRow(
      "Model",
      "Model used to generate a thread name from its first message.",
      dynamicChild(titleModels, (models) => select(
        {
          class: "settings-select",
          value: state.titleModel,
          onChange: (event) => void controller.models.titleModel(
            (event.target as HTMLSelectElement).value,
          ),
        },
        ...models.map((model) => option({ value: model.slug }, model.name)),
      )),
    ),
    settingRow(
      "Thinking",
      "Reasoning effort used for thread-title generation.",
      dynamicChild(titleModel, (model) => select(
        {
          class: "settings-select",
          value: state.titleReasoning,
          disabled: !model?.reasoning.length,
          onChange: (event) => void controller.models.titleReasoning(
            (event.target as HTMLSelectElement).value,
          ),
        },
        ...(model?.reasoning.length
          ? model.reasoning.map((item) => option({ value: item.id }, item.label))
          : [option({ value: "" }, "Not supported")]),
      )),
    ),
  );
}
