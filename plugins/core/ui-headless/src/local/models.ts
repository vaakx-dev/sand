import type { Context } from 'drydock'
import type { ModelLookup } from '../follow/models'

export const localModels = (ctx: Context<'sessions'>): ModelLookup => ({
  model: session => ctx.modelSettings?.effective(ctx.sessions.open(session)).model,
  label: model => ctx.llm?.models?.().find(info => info.id === model)?.label ?? model,
})
