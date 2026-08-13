import type { ProviderContribution } from "../api.ts";
import { Contributions } from "./contributions.ts";

export class Providers {
  private readonly providers = new Contributions<ProviderContribution>(
    "provider contribution",
    (provider) => provider.id,
  );

  register(provider: ProviderContribution): () => void {
    return this.providers.register(provider);
  }

  list(): ProviderContribution[] {
    return this.providers.list().sort((left, right) => left.name.localeCompare(right.name));
  }

  refresh(): void {
    this.providers.refresh();
  }

  subscribe(listener: () => void): () => void {
    return this.providers.subscribe(listener);
  }
}
