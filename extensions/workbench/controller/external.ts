import { ControllerRuntime } from "./runtime.ts";

export class ExternalController {
  constructor(private readonly runtime: ControllerRuntime) {}

  async open(target: "vscode" | "explorer"): Promise<void> {
    await this.runtime.guard(async () => {
      await this.runtime.command(`workspace.open.${target}`);
      this.runtime.state.openMenuOpen.set(false);
    });
  }
}
