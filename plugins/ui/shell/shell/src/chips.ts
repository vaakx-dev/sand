import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, list, show, span, type Sig } from '@vaakx-dev/vrui'
import type { ChipItem, ChipScope, ChipSource, Status } from './contract'

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
    lead: item.status ? kit.statusIcon(item.status) : item.icon ? kit.icon(item.icon, 'sm') : undefined,
    meta: item.meta,
    action: action && kit.primaryAction({ size: 'sm', disabled: () => action.busy?.() ?? false, onClick: () => void action.run() }, action.label),
    onClick: open && (() => {
      close()
      open()
    }),
  })
}

const tones: Partial<Record<Status, string>> = {
  waiting: 'text-warning-400',
  ready: 'text-success-400',
  merging: 'text-info-400',
  running: 'text-info-400',
}

const toneOf = (status: Status | undefined) => (status && tones[status]) || 'text-neutral-500'

const mark = (kit: Kit, status: Status | undefined) =>
  status === 'running' || status === 'merging' ? kit.spinner('xs') : span({ class: 'h-1.5 w-1.5 rounded-full bg-current' })

const countView = (kit: Kit, chip: Sig<Chip>, scope: ChipScope) => {
  const items = derive(() => chip.get().sources.flatMap(source => source.items(scope)))
  const head = () => chip.get().head
  return div(
    { class: 'contents' },
    show(
      () => items.get().length > 0,
      () =>
        div(
          { class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1' },
          kit.dropdown({
            placement: 'auto-left',
            flat: true,
            menuClass: 'w-80 max-h-80 overflow-y-auto *:first:pt-1.5',
            trigger: (press, open) =>
              kit.plainButton(
                {
                  ...press,
                  'aria-expanded': () => String(open.get()),
                  class: () => ['inline-flex min-w-0 items-center gap-1.5 rounded-sm px-1 py-1 text-xs hover:text-neutral-100', toneOf(head().status)],
                  'aria-label': () => `${items.get().length} ${head().label}`,
                },
                span({ class: 'inline-flex shrink-0' }, mark(kit, head().status)),
                span({ class: 'tabular-nums' }, () => String(items.get().length)),
                span({ class: 'truncate' }, () => head().label),
              ),
            items: close => [
              kit.sectionHeading(
                span({ class: 'min-w-0 flex-1 truncate' }, () => head().title),
                kit.closeButton({ size: 'sm', surface: 'raised', class: '-mr-1', onClick: close }),
              ),
              list(
                items,
                item => item.id,
                item => div({ class: 'contents' }, itemRow(kit, item.get(), close)),
                div({ class: 'flex flex-col' }),
              ),
            ],
          }),
        ),
    ),
  )
}

export const chipBar = (kit: Kit, sources: Sig<ChipSource[]>, scope: ChipScope) =>
  div(
    { class: 'flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1' },
    list(
      derive(() => chipsOf(sources.get())),
      chip => chip.key,
      chip => countView(kit, chip, scope),
      div({ class: 'contents' }),
    ),
  )
