import { Listeners } from "./listeners.ts";

export class Contributions<Value> {
  private readonly entries = new Map<string, Value>();
  private readonly changes = new Listeners<[]>();

  constructor(
    private readonly label: string,
    private readonly identify: (value: Value) => string,
  ) {}

  register(value: Value): () => void {
    const id = this.identify(value);
    if (this.entries.has(id)) throw new Error(`${this.label} already registered: ${id}`);
    this.entries.set(id, value);
    this.changes.notify();
    return () => {
      if (this.entries.get(id) !== value) return;
      this.entries.delete(id);
      this.changes.notify();
    };
  }

  get(id: string): Value | undefined {
    return this.entries.get(id);
  }

  list(): Value[] {
    return [...this.entries.values()];
  }

  refresh(): void {
    this.changes.notify();
  }

  subscribe(listener: () => void): () => void {
    return this.changes.subscribe(listener);
  }
}
