import type { ModelInfo } from '@sand/protocol'

export const favouritesOf = (models: ModelInfo[]) =>
  models.filter(model => model.favourite !== undefined).sort((a, b) => (a.favourite ?? 0) - (b.favourite ?? 0))
