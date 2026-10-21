import { llm, type ModelInfo } from '@sand/accounts/contract'
import { modelSettings } from '@sand/model/contract'
import type { Tool } from '@sand/tools/contract'
import type { Context } from 'drydock'
import { z } from 'zod'

export const group = 'agents'

const input = z.object({})

const contextSize = (tokens: number) => `${Math.round(tokens / 1000)}k context`

const modelLine = (model: ModelInfo, current: string | undefined) =>
  [
    model.id,
    model.label,
    model.provider,
    model.efforts.length ? `effort ${model.efforts.join('/')}${model.defaultEffort ? ` (default ${model.defaultEffort})` : ''}` : 'no effort levels',
    model.context && contextSize(model.context),
    model.fast && 'fast mode',
    model.id === current && 'current',
  ]
    .filter(Boolean)
    .join(' · ')

export const modelsTool = (ctx: Context): Tool<typeof input> => ({
  name: 'models',
  description: 'List the models you can give agents: id, label, provider, effort levels, context size and fast mode. Marks the model this thread uses.',
  group,
  input,
  run(_input, { session }) {
    const models = ctx.get(llm)?.models?.().filter(model => !model.hidden) ?? []
    const current = ctx.get(modelSettings)?.effective(session).model
    return models.length ? models.map(model => modelLine(model, current)).join('\n') : 'No models are available.'
  },
})
