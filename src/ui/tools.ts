import type { UiToolPresentation } from "@sand/extension-api";

import { Contributions } from "./contributions.ts";

export class Tools {
  private readonly presentations = new Contributions<UiToolPresentation>(
    "tool presentation",
    (presentation) => presentation.name,
  );

  register(presentation: UiToolPresentation): () => void {
    return this.presentations.register(presentation);
  }

  get(name: string): UiToolPresentation | undefined {
    return this.presentations.get(name);
  }

  subscribe(listener: () => void): () => void {
    return this.presentations.subscribe(listener);
  }
}
