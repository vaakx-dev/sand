import type { JsonValue } from "@sand/extension-api";

import type { ReasoningEffort } from "../models.ts";
import { ControllerRuntime } from "./runtime.ts";

export class ModelsController {
  constructor(private readonly runtime: ControllerRuntime) {}

  toggleProvider(id: string): void {
    this.runtime.state.providerSections.update((sections) => ({
      ...sections,
      [id]: !(sections[id] ?? false),
    }));
  }

  setInput(provider: string, value: string): void {
    this.runtime.state.providerModelInputs.update((inputs) => ({ ...inputs, [provider]: value }));
  }

  async add(provider: string): Promise<void> {
    const state = this.runtime.state;
    const slug = (state.providerModelInputs.get()[provider] ?? "").trim();
    if (!slug) return;
    const models = state.providerModels.get()[provider] ?? [];
    if (models.some((model) => model.slug === slug)) {
      this.runtime.notice(`${slug} is already in ${provider}`);
      return;
    }
    state.providerModels.update((catalog) => ({
      ...catalog,
      [provider]: [...models, { slug, favorite: false, hidden: false }],
    }));
    this.setInput(provider, "");
    await this.saveCatalog();
  }

  async favorite(provider: string, slug: string): Promise<void> {
    await this.update(provider, slug, (model) => ({ ...model, favorite: !model.favorite }));
  }

  async hide(provider: string, slug: string): Promise<void> {
    await this.update(provider, slug, (model) => ({ ...model, hidden: !model.hidden }));
    const state = this.runtime.state;
    const models = state.providerModels.get()[provider] ?? [];
    const visible = models.find((model) => !model.hidden)?.slug;
    if (visible && state.provider.get() === provider && state.model.get() === slug) {
      const settings = await this.runtime.saveOne("workbench.model", visible);
      state.settings.set(settings);
      state.model.set(visible);
    }
    if (visible && state.titleProvider.get() === provider && state.titleModel.get() === slug) {
      state.titleModel.set(visible);
      await this.saveTitle();
    }
  }

  async move(provider: string, slug: string, amount: number): Promise<void> {
    const state = this.runtime.state;
    const models = [...(state.providerModels.get()[provider] ?? [])];
    const index = models.findIndex((model) => model.slug === slug);
    const target = index + amount;
    if (index < 0 || target < 0 || target >= models.length) return;
    const [model] = models.splice(index, 1);
    if (!model) return;
    models.splice(target, 0, model);
    state.providerModels.update((catalog) => ({ ...catalog, [provider]: models }));
    await this.saveCatalog();
  }

  async titleProvider(id: string): Promise<void> {
    const state = this.runtime.state;
    const models = state.providerModels.get()[id] ?? [];
    state.titleProvider.set(id);
    state.titleModel.set(models.find((model) => !model.hidden)?.slug || models[0]?.slug || "");
    await this.saveTitle();
  }

  async titleModel(slug: string): Promise<void> {
    this.runtime.state.titleModel.set(slug);
    await this.saveTitle();
  }

  async titleReasoning(reasoning: ReasoningEffort): Promise<void> {
    this.runtime.state.titleReasoning.set(reasoning);
    await this.saveTitle();
  }

  private async update(
    provider: string,
    slug: string,
    change: (model: { slug: string; favorite: boolean; hidden: boolean }) => {
      slug: string;
      favorite: boolean;
      hidden: boolean;
    },
  ): Promise<void> {
    this.runtime.state.providerModels.update((catalog) => ({
      ...catalog,
      [provider]: (catalog[provider] ?? []).map((model) => model.slug === slug ? change(model) : model),
    }));
    await this.saveCatalog();
  }

  private saveCatalog(): Promise<void> {
    return this.runtime.saveOne(
      "workbench.providerModels",
      this.runtime.state.providerModels.get() as unknown as JsonValue,
    ).then((settings) => this.runtime.state.settings.set(settings));
  }

  private saveTitle(): Promise<void> {
    const state = this.runtime.state;
    return this.runtime.saveOne("agent.titleGeneration", {
      provider: state.titleProvider.get(),
      model: state.titleModel.get(),
      reasoning: state.titleReasoning.get(),
    }).then((settings) => state.settings.set(settings));
  }
}
