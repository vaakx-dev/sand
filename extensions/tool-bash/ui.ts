import { icon } from "@vaakx-dev/vrui";
import { SquareTerminal } from "lucide";

import type { UiExtension } from "@sand/extension-api";
import { useWorkbench } from "sand:api/workbench";

const extension: UiExtension = {
  activate(context) {
    useWorkbench(context.apis).tools.register({
      name: "bash",
      label: "Ran command",
      renderIcon: (size) => icon(SquareTerminal, size),
      preview: (input) => preview(input.command),
    });
  },
};

function preview(value: unknown): string {
  if (typeof value !== "string") return "";
  const compact = value.replace(/\s+/gu, " ").trim();
  return compact.length > 110 ? `${compact.slice(0, 107)}...` : compact;
}

export default extension;
