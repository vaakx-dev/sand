import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ChipItem, ChipScope, ChipSource } from './contract'
import { statusIcon } from './marks'

interface Chip {
  key: string
  head: ChipSource
  sources: ChipSource[]
}

const chipsOf = (sources: ChipSource[]) => {
  const byKey = new Map<string, Chip>()
  for (const source of sources) {
    const found = byKey.get(source.key)
    if (found) found.sources.push(source)
    else byKey.set(source.key, { key: source.key, head: source, sources: [source] })
  }
  return [...byKey.values()]
}

const itemRow = (kit: Kit, item: ChipItem, close: () => void) => {
  const { action, open } = item
  return kit.chipRow({
    title: item.label,
    lead: item.status ? statusIcon(kit, item.status) : item.icon ? kit.icon(item.icon, 'sm') : undefined,
    meta: item.meta,
    action: action && kit.primaryAction({ size: 'sm', disabled: () => action.busy?.() ?? false, onClick: () => void action.run() }, action.label),
    onClick: open && (() => {
      close()
      open()
    }),
  })
}

const chipView = (kit: Kit, chip: Sig<Chip>, scope: ChipScope) => {
  const items = derive(() => chip.get().sources.flatMap(source => source.items(scope)))
  const head = () => chip.get().head
  return div(
    { class: 'contents' },
    show(
      () => items.get().length > 0,
      () =>
        kit.countChip({
          label: () => head().label,
          count: () => items.get().length,
          lead: dynamicChild(
            () => head().status,
            status => (status ? statusIcon(kit, status) : null),
          ),
          items: close => [
            div(
              { class: 'flex items-center gap-2 pl-2 text-xs text-neutral-500' },
              span({ class: 'min-w-0 flex-1 truncate' }, () => head().title),
              kit.closeButton({ size: 'sm', surface: 'raised', onClick: close }),
            ),
            list(
              items,
              item => item.id,
              item => div({ class: 'contents' }, dynamicChild(item, value => itemRow(kit, value, close))),
              div({ class: 'flex flex-col' }),
            ),
          ],
        }),
    ),
  )
}

export const chipBar = (kit: Kit, sources: Sig<ChipSource[]>, scope: ChipScope) =>
  list(
    derive(() => chipsOf(sources.get())),
    chip => chip.key,
    chip => chipView(kit, chip, scope),
    div({ class: 'flex flex-wrap gap-1.5' }),
  )
