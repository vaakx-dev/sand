import type { EffortLevel, ModelInfo, PickItem } from '@sand/protocol'
import { tokens } from '@sand/kit'
import { describe, levelLabel, modelOf } from '../effective'
import { applyChoice } from './apply'
import type { Tools } from './context'

const detail = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' · ')

const makeDefault = [{ id: 'default', label: 'Make default' }]

const status = ({ ctx, choices }: Tools) => {
  const { next } = choices.state(ctx.ui.session())
  return next && `${describe(next, ctx.llm)} · after this turn`
}

export const effortSheet = async (tools: Tools, model: ModelInfo) => {
  const { ctx, choices, defaults: saved } = tools
  const shown = (({ current, next }) => next ?? current)(choices.state(ctx.ui.session()))
  const defaults = saved.get()
  const levels = (ctx.llm?.levels?.() ?? []).filter(level => model.efforts.includes(level.id))
  const items: PickItem<EffortLevel['id'] | null>[] = [
    ...levels.map(level => ({
      label: level.label,
      detail: detail(level.id === shown.effort && 'current', level.id === model.defaultEffort && 'model default'),
      search: level.id,
      value: level.id,
    })),
    { label: 'Use default', detail: levelLabel(ctx.llm, defaults.effort ?? model.defaultEffort), value: null },
  ]
  const picked = await ctx.ui.choose(`Effort · ${model.label}`, items, {
    status: status(tools),
    actions: makeDefault,
    selected: Math.max(0, levels.findIndex(level => level.id === shown.effort)),
  })
  if (!picked || picked.value === undefined) return
  await applyChoice(tools, { effort: picked.value }, { asDefault: picked.action === 'default' })
}

export const modelSheet = async (tools: Tools) => {
  const { ctx, choices, defaults: saved } = tools
  const models = ctx.llm?.models?.() ?? []
  const shown = (({ current, next }) => next ?? current)(choices.state(ctx.ui.session()))
  const defaults = saved.get()
  const items: PickItem<string | null>[] = [
    ...models.map(model => ({
      label: model.label,
      detail: detail(model.context ? tokens(model.context) : undefined, model.id === shown.model && 'current', model.id === defaults.model && 'default'),
      search: model.id,
      value: model.id,
    })),
    { label: 'Use default', detail: modelOf(ctx.llm, defaults.model)?.label ?? defaults.model, value: null },
  ]
  const picked = await ctx.ui.choose('Model', items, {
    status: status(tools),
    actions: makeDefault,
    selected: Math.max(0, models.findIndex(model => model.id === shown.model)),
  })
  if (!picked || picked.value === undefined) return
  const asDefault = picked.action === 'default'
  if (asDefault && picked.value === null) return
  const chosen = modelOf(ctx.llm, picked.value ?? defaults.model)
  const more = Boolean(chosen?.efforts.length) && !asDefault
  await applyChoice(tools, { model: picked.value }, { asDefault, quiet: more })
  if (more) await effortSheet(tools, chosen!)
}
