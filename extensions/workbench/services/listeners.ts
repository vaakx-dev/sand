type Listener<Arguments extends unknown[]> = (...arguments_: Arguments) => void;

export class Listeners<Arguments extends unknown[]> {
  private readonly listeners = new Set<Listener<Arguments>>();

  subscribe(listener: Listener<Arguments>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(...arguments_: Arguments): void {
    for (const listener of this.listeners) listener(...arguments_);
  }
}
