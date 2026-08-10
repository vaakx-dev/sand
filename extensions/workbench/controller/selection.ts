import {
  objectValue,
  selectProviderOption,
  type JsonObject,
} from "@sand/extension-api";

import {
  findModel,
  findProvider,
  firstModel,
} from "../modelCatalog.ts";
import { ControllerRuntime } from "./runtime.ts";

export class SelectionController {
  constructor(private readonly runtime: ControllerRuntime) {}

  async selectProvider(id: string): Promise<void> {
    const state = this.runtime.state;
    const provider = findProvider(state.providers.get(), id);
    const model = firstModel(state.providerModels.get(), provider);
    await this.select(id, model?.slug || provider?.defaultModel || "");
  }

  async select(provider: string, model: string): Promise<void> {
    const state = this.runtime.state;
    state.provider.set(provider);
    state.model.set(model);
    this.restore(provider, model);
    state.modelPickerOpen.set(false);
    state.modelQuery.set("");
    await this.runtime.save([
      ["workbench.provider", provider],
      ["workbench.model", model],
    ]);
    await this.saveOptions();
  }

  restore(providerId: string, slug: string): void {
    const state = this.runtime.state;
    const provider = findProvider(state.providers.get(), providerId);
    const model = findModel(state.providerModels.get(), providerId, slug);
    const settings = objectValue(state.settings.get()[`provider.${providerId}`] ?? null);
    const reasoning = model?.reasoning ?? provider?.modelDefaults.reasoning ?? [];
    const serviceTiers = model?.serviceTiers ?? provider?.modelDefaults.serviceTiers ?? [];
    state.reasoning.set(selectProviderOption(
      settings.reasoning,
      reasoning,
      model?.defaultReasoning ?? provider?.modelDefaults.defaultReasoning ?? "",
    ));
    state.serviceTier.set(selectProviderOption(
      settings.serviceTier,
      serviceTiers,
      model?.defaultServiceTier ?? provider?.modelDefaults.defaultServiceTier ?? "",
    ));
  }

  async saveOptions(): Promise<void> {
    const state = this.runtime.state;
    const key = `provider.${state.provider.get()}`;
    const current = objectValue(state.settings.get()[key] ?? null);
    const next: JsonObject = {
      ...current,
      reasoning: state.reasoning.get(),
      serviceTier: state.serviceTier.get(),
    };
    state.settings.set(await this.runtime.saveOne(key, next));
  }
}
