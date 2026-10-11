import type { ModelInfo } from '@sand/llm-accounts/contract'
import type { EffectiveSettings } from '@sand/model/contract'
import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import { matching } from '@sand/dom'
import { sourceName, tokens } from '@sand/kit'
import type { Actions, PanelContext } from './actions'

interface Row {
  item: PaletteItem
  words: string
}

const modelRows = (ctx: PanelContext, actions: Actions, shown?: EffectiveSettings): Row[] => {
  const defaults = ctx.models.defaults()
  const sources = ctx.models.sources()
  return ctx.models.list().map(model => {
    const source = sources.find(known => known.id === model.source)
    const from = source ? sourceName(source) : undefined
    const detail = [from, model.id === shown?.model && 'current', model.id === defaults.model && 'default', model.context ? tokens(model.context) : undefined]
    return {
      item: {
        id: `model:${model.id}`,
        group: 'Model',
        icon: 'sparkles',
        label: `Use ${model.label}`,
        detail: detail.filter(Boolean).join(' · '),
        run: () => actions.set({ model: model.id }),
      },
      words: `model ${model.id} ${model.label} ${from ?? ''}`,
    }
  })
}

const effortRows = (ctx: PanelContext, actions: Actions, info: ModelInfo, shown?: EffectiveSettings): Row[] =>
  ctx.models
    .levels()
    .filter(level => info.efforts.includes(level.id))
    .map(level => ({
      item: {
        id: `effort:${level.id}`,
        group: 'Model',
        icon: 'sliders',
        label: `Effort: ${level.label}`,
        detail: level.id === shown?.effort ? 'current' : undefined,
        run: () => actions.set({ effort: level.id }),
      },
      words: `effort thinking ${level.id} ${level.label}`,
    }))

const fastRow = (actions: Actions, shown?: EffectiveSettings): Row => {
  const on = shown?.speed === 'fast'
  return {
    item: {
      id: 'model:fast',
      group: 'Model',
      icon: 'zap',
      label: on ? 'Turn fast mode off' : 'Turn fast mode on',
      run: () => actions.set({ speed: on ? 'normal' : 'fast' }),
    },
    words: 'fast mode speed',
  }
}

const rows = (ctx: PanelContext, actions: Actions): Row[] => {
  const state = ctx.models.state()
  const shown = state?.next ?? state?.current
  const info = ctx.models.info(shown?.model)
  return [...modelRows(ctx, actions, shown), ...(info ? effortRows(ctx, actions, info, shown) : []), ...(info?.fast ? [fastRow(actions, shown)] : [])]
}

export const modelSource = (ctx: PanelContext, actions: Actions): PaletteSource => ({
  id: 'model',
  order: 15,
  items(query) {
    if (query.startsWith('/') || !query.trim()) return []
    const all = rows(ctx, actions)
    return matching(
      all.map(row => `${row.item.label} ${row.words}`),
      query,
      true,
    ).flatMap(index => {
      const row = all[index]
      return row ? [{ ...row.item, search: row.words }] : []
    })
  },
})
