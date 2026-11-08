import type { ModelInfo } from '@sand/accounts/contract'
import type { Picked } from '@sand/model-picker/contract'
import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import { sourceName } from '@sand/model-picker/contract'
import { matching, tokens } from '@sand/util'
import type { PanelContext } from './context'
import type { ModelTarget } from './contract'

interface Row {
  item: PaletteItem
  words: string
}

const modelRows = (ctx: PanelContext, target: ModelTarget, shown?: Picked): Row[] => {
  const defaults = ctx.models.defaults()
  const sources = ctx.models.sources()
  return ctx.models.list().map(model => {
    const source = sources.find(known => known.id === model.source)
    const from = source ? sourceName(source) : undefined
    const detail = [model.id === shown?.model && 'current', model.id === defaults.model && 'default', model.context ? tokens(model.context) : undefined]
    return {
      item: {
        id: `model:${model.id}`,
        group: 'Model',
        icon: 'sparkles',
        label: `Use ${model.label}`,
        detail: detail.filter(Boolean).join(' · '),
        run: () => target.choose({ model: model.id }),
      },
      words: `model ${model.id} ${model.label} ${from ?? ''}`,
    }
  })
}

const effortRows = (ctx: PanelContext, target: ModelTarget, info: ModelInfo, shown?: Picked): Row[] =>
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
        run: () => target.choose({ effort: level.id }),
      },
      words: `effort thinking ${level.id} ${level.label}`,
    }))

const fastRow = (target: ModelTarget, shown?: Picked): Row => {
  const on = shown?.speed === 'fast'
  return {
    item: {
      id: 'model:fast',
      group: 'Model',
      icon: 'zap',
      label: on ? 'Turn fast mode off' : 'Turn fast mode on',
      run: () => target.choose({ speed: on ? 'normal' : 'fast' }),
    },
    words: 'fast mode speed',
  }
}

const rows = (ctx: PanelContext, target: ModelTarget): Row[] => {
  const shown = ctx.modelPicker.resolve(target.settings())
  const info = ctx.models.info(shown.model)
  return [...modelRows(ctx, target, shown), ...(info ? effortRows(ctx, target, info, shown) : []), ...(info?.fast ? [fastRow(target, shown)] : [])]
}

export const modelSource = (ctx: PanelContext, target: ModelTarget): PaletteSource => ({
  id: 'model',
  order: 15,
  items(query) {
    if (query.startsWith('/') || !query.trim()) return []
    const all = rows(ctx, target)
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
