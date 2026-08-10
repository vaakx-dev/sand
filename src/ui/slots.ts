import type { UiSlotContribution } from "@sand/extension-api";

export class Slots {
  private readonly contributions = new Map<string, Map<string, UiSlotContribution>>();
  private readonly mounts = new Map<string, HTMLElement>();

  register(contribution: UiSlotContribution): () => void {
    const slot = this.contributions.get(contribution.slot) ?? new Map();
    if (slot.has(contribution.id)) throw new Error(`UI slot contribution already registered: ${contribution.id}`);
    slot.set(contribution.id, contribution);
    this.contributions.set(contribution.slot, slot);
    this.sync(contribution.slot);
    return () => {
      slot.delete(contribution.id);
      this.sync(contribution.slot);
    };
  }

  mount(slot: string, container: HTMLElement): () => void {
    const previous = this.mounts.get(slot);
    if (previous && previous !== container) previous.replaceChildren();
    this.mounts.set(slot, container);
    this.sync(slot);
    return () => {
      if (this.mounts.get(slot) !== container) return;
      this.mounts.delete(slot);
      container.replaceChildren();
    };
  }

  private sync(slot: string): void {
    const nodes = [...(this.contributions.get(slot)?.values() ?? [])]
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0) || left.id.localeCompare(right.id))
      .map((contribution) => contribution.node);
    this.mounts.get(slot)?.replaceChildren(...nodes);
  }
}
