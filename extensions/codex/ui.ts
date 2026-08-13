import {
  objectValue,
  stringValue,
  type UiExtension,
} from "@sand/extension-api";

import { useWorkbench } from "sand:api/workbench";
import { CodexConnection } from "./connection.ts";
import { OPENAI_ICON } from "./presentation.ts";

const AGENT_ID = "codex";

const extension: UiExtension = {
  async activate(context) {
    const workbench = useWorkbench(context.apis);
    const connection = new CodexConnection(context.runtime);

    workbench.providers.register({
      id: AGENT_ID,
      name: "Codex CLI",
      description: "Use the locally installed Codex CLI and its available models.",
      icon: OPENAI_ICON,
      connection: {
        connectLabel: "Connect",
        connectingLabel: "Connecting…",
        disconnectLabel: "Disconnect",
        status: () => connection.status(),
        connect: () => connection.connect(),
        disconnect: () => connection.disconnect(),
      },
    });
    context.runtime.subscribe((event) => {
      if (!event.kind.startsWith("acp.agent.")) return;
      const payload = objectValue(event.payload);
      if (stringValue(payload.agentId) !== AGENT_ID) return;
      workbench.providers.refresh();
    });
    context.runtime.subscribeWorkspace(() => workbench.providers.refresh());
    await connection.tryConnect();
    workbench.providers.refresh();
  },
};

export default extension;
