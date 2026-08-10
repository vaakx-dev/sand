import type { UiCommand } from "@sand/extension-api";

export class Commands {
  private readonly commands = new Map<string, UiCommand>();
  private readonly listeners = new Set<() => void>();

  register(command: UiCommand): () => void {
    if (this.commands.has(command.id)) throw new Error(`UI command already registered: ${command.id}`);
    this.commands.set(command.id, command);
    this.notify();
    return () => {
      this.commands.delete(command.id);
      this.notify();
    };
  }

  list(): UiCommand[] {
    return [...this.commands.values()].sort((left, right) => left.label.localeCompare(right.label));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async execute(id: string): Promise<void> {
    const command = this.commands.get(id);
    if (!command) throw new Error(`unknown UI command: ${id}`);
    await command.run();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
