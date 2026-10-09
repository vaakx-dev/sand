import type { PaletteItem, PaletteSource } from '@sand/protocol'
import { matching } from '@sand/dom'
import { tokens } from '@sand/kit'
import type { Actions, PanelContext } from './actions'

interface Row {
  item: PaletteItem
  words: string
}

const rows = (ctx: PanelContext, actions: Actions): Row[] => {
  const state = ctx.models.state()
  const shown = state?.next ?? state?.current
  const defaults = ctx.models.defaults()
  const info = ctx.models.info(shown?.model)
  const models = ctx.models.list().map(model => ({
    item: {
      id: `model:${model.id}`,
      group: 'Model',
      icon: 'sparkles',
      label: `Use ${model.label}`,
      detail: [model.id === shown?.model && 'current', model.id === defaults.model && 'default', model.context ? tokens(model.context) : undefined].filter(Boolean).join(' · '),
      run: () => actions.set({ model: model.id }),
    },
    words: `model ${model.id} ${model.label}`,
  }))
  const efforts = info?.efforts.length
    ? ctx.models
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
    : []
  const fast = info?.fast
    ? [
        {
          item: {
            id: 'model:fast',
            group: 'Model',
            icon: 'zap',
            label: shown?.speed === 'fast' ? 'Turn fast mode off' : 'Turn fast mode on',
            run: () => actions.set({ speed: shown?.speed === 'fast' ? 'normal' : 'fast' }),
          },
          words: 'fast mode speed',
        },
      ]
    : []
  return [...models, ...efforts, ...fast]
}

export const modelSource = (ctx: PanelContext, actions: Actions): PaletteSource => ({
  id: 'model',
  order: 15,
  items(query) {
    if (query.startsWith('/')) return []
    if (!query.trim()) return []
    const all = rows(ctx, actions)
    return matching(
      all.map(row => `${row.item.label} ${row.words}`),
      query,
      true,
    ).map(index => ({ ...all[index]!.item, search: all[index]!.words }))
  },
})
