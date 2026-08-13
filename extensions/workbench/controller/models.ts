import {
  selectProviderOption,
  type JsonValue,
} from "@sand/extension-api";

import {
  findModel,
  findProvider,
  providerModel,
} from "../modelCatalog.ts";
import type { ProviderModel, ProviderModels } from "../models.ts";
import type { WorkbenchState } from "../state.ts";
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
    const description = findProvider(state.providers.get(), provider);
    if (!description) return;
    state.providerModels.update((catalog) => ({
      ...catalog,
      [provider]: [...models, providerModel(description, slug)],
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
      syncTitleReasoning(state);
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

  async titleSelection(provider: string, model: string): Promise<void> {
    const state = this.runtime.state;
    state.titleProvider.set(provider);
    state.titleModel.set(model);
    syncTitleReasoning(state);
    await this.saveTitle();
  }

  async titleReasoning(reasoning: string): Promise<void> {
    this.runtime.state.titleReasoning.set(reasoning);
    await this.saveTitle();
  }

  private async update(
    provider: string,
    slug: string,
    change: (model: ProviderModel) => ProviderModel,
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
      catalogPreferences(this.runtime.state.providerModels.get()) as unknown as JsonValue,
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

function syncTitleReasoning(state: WorkbenchState): void {
  const model = findModel(
    state.providerModels.get(),
    state.titleProvider.get(),
    state.titleModel.get(),
  );
  state.titleReasoning.set(selectProviderOption(
    state.titleReasoning.get(),
    model?.reasoning ?? [],
    model?.defaultReasoning ?? "",
  ));
}

function catalogPreferences(catalog: ProviderModels) {
  return Object.fromEntries(Object.entries(catalog).map(([provider, models]) => [
    provider,
    models.map(({ slug, favorite, hidden }) => ({ slug, favorite, hidden })),
  ]));
}
