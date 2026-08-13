import { h2 } from "@vaakx-dev/vrui";

import type { SandUi } from "sand:api/ui";
import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { createGenerationPickerState, generationControl } from "../generation.ts";
import { page, settingRow } from "./shared.ts";

export function generalPage(
  controller: WorkbenchController,
  state: WorkbenchState,
  ui: SandUi,
): HTMLElement {
  const picker = createGenerationPickerState();
  return page(
    ui,
    "General",
    settingRow(
      ui,
      "Settle inactive threads",
      "Move quiet threads into the Settled shelf after the selected number of days.",
      ui.selectField({
        value: state.threads.autoSettleDays.map((days) => days === null ? "off" : String(days)),
        options: [
          { value: "off", label: "Off" },
          ...[1, 3, 7, 14, 30].map((days) => ({ value: String(days), label: `After ${days} day${days === 1 ? "" : "s"}` })),
        ],
        onChange: (event) => {
          const value = (event.target as HTMLSelectElement).value;
          state.threads.autoSettleDays.set(value === "off" ? null : Number(value));
          void controller.preferences.saveBehavior();
        },
      }),
    ),
    h2("Text generation"),
    settingRow(
      ui,
      "Thread titles",
      "Model and reasoning used to generate a thread name from its first message.",
      generationControl(
        controller,
        state,
        ui,
        {
          provider: state.titleProvider,
          model: state.titleModel,
          reasoning: state.titleReasoning,
          selectModel: (provider, model) => controller.models.titleSelection(provider, model),
          selectReasoning: (value) => controller.models.titleReasoning(value),
        },
        picker,
      ),
    ),
  );
}
