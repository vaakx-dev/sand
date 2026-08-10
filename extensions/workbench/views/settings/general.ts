import { derive, dynamicChild, h2, option, select } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../controller.ts";
import type { ReasoningEffort } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { page, settingRow, toggle } from "./shared.ts";

const REASONING: { value: ReasoningEffort; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra High" },
  { value: "max", label: "Max" },
  { value: "ultra", label: "Ultra" },
];

export function generalPage(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const titleModels = derive(() =>
    (state.providerModels.get()[state.titleProvider.get()] ?? []).filter((model) => !model.hidden)
  );

  return page(
    "General",
    settingRow(
      "Auto-open task panel",
      "Open the right-side task panel when the agent publishes steps or starts a tool.",
      toggle(state.autoOpenTasks, () => void controller.preferences.saveBehavior()),
    ),
    settingRow(
      "Settle inactive threads",
      "Move quiet threads into the Settled shelf after the selected number of days.",
      select(
        {
          class: "settings-select",
          value: state.autoSettleDays.map((days) => days === null ? "off" : String(days)),
          onChange: (event) => {
            const value = (event.target as HTMLSelectElement).value;
            state.autoSettleDays.set(value === "off" ? null : Number(value));
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
        ...models.map((model) => option({ value: model.slug }, model.slug)),
      )),
    ),
    settingRow(
      "Thinking",
      "Reasoning effort used for thread-title generation.",
      select(
        {
          class: "settings-select",
          value: state.titleReasoning,
          onChange: (event) => void controller.models.titleReasoning(
            (event.target as HTMLSelectElement).value as ReasoningEffort,
          ),
        },
        ...REASONING.map((item) => option({ value: item.value }, item.label)),
      ),
    ),
  );
}
