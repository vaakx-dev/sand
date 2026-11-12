import type { LLM, ModelInfo } from '@sand/accounts/contract'
import type { ModelRow } from './contract'

const rowOf = ({ id, label, provider, efforts, defaultEffort, context, fast }: ModelInfo, current: string | undefined): ModelRow => ({
  id,
  label,
  provider,
  efforts,
  defaultEffort,
  context,
  fast,
  ...(id === current && { current: true }),
})

export const modelRows = (llm: LLM | undefined, current: string | undefined) =>
  (llm?.models?.() ?? []).filter(model => !model.hidden).map(model => rowOf(model, current))
