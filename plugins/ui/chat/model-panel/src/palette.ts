import type { ModelInfo } from '@sand/accounts/contract'
import type { Picked } from '@sand/model-picker/contract'
import type { PaletteItem, PaletteSource } from '@sand/palette/contract'
import { matching } from '@sand/util'
import type { PanelContext } from './context'
import type { ModelTarget } from './contract'

interface Row {
  item: PaletteItem
  words: string
}

const changeRow = (ctx: PanelContext, open: () => void, shown: Picked): Row => ({
  item: {
    id: 'model:change',
    group: 'Model',
    icon: 'sparkles',
    label: 'Change model',
    detail: ctx.models.label(shown),
    run: open,
  },
  words: `model change switch ${ctx.models.label(shown)}`,
})

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

const rows = (ctx: PanelContext, target: ModelTarget, open: () => void): Row[] => {
  const shown = ctx.modelPicker.resolve(target.settings())
  const info = ctx.models.info(shown.model)
  return [changeRow(ctx, open, shown), ...(info ? effortRows(ctx, target, info, shown) : []), ...(info?.fast ? [fastRow(target, shown)] : [])]
}

export const modelSource = (ctx: PanelContext, target: ModelTarget, open: () => void): PaletteSource => ({
  id: 'model',
  order: 15,
  items(query) {
    if (query.startsWith('/') || !query.trim()) return []
    const all = rows(ctx, target, open)
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
