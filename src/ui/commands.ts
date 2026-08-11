import type { UiCommand } from "@sand/extension-api";

import { Contributions } from "./contributions.ts";

export class Commands {
  private readonly commands = new Contributions<UiCommand>("UI command", (command) => command.id);

  register(command: UiCommand): () => void {
    return this.commands.register(command);
  }

  list(): UiCommand[] {
    return this.commands.list().sort((left, right) => left.label.localeCompare(right.label));
  }

  subscribe(listener: () => void): () => void {
    return this.commands.subscribe(listener);
  }

  async execute(id: string): Promise<void> {
    const command = this.commands.get(id);
    if (!command) throw new Error(`unknown UI command: ${id}`);
    await command.run();
  }
}
