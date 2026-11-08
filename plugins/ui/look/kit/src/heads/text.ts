import { h1, h2, p, read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { isMac } from '../page/platform'

export const pageTitleLook = 'min-w-0 text-xl font-semibold tracking-tight text-neutral-100'

export const pageTitle = (...children: Child[]) => h1({ class: pageTitleLook }, ...children)

const barTitleLook = 'min-w-0 flex-1 truncate text-sm font-medium text-neutral-100'

export const barTitle = (...children: Child[]) => h1({ class: barTitleLook }, ...children)

export const sheetTitle = (...children: Child[]) => h2({ class: barTitleLook }, ...children)

export const sectionTitle = (...children: Child[]) => h2({ class: 'min-w-0 text-sm font-semibold text-neutral-100' }, ...children)

export const secondaryLook = 'text-sm text-neutral-400'

export const secondaryText = (...children: Child[]) => p({ class: secondaryLook }, ...children)

const rowTitleSize = 'text-sm font-medium'

const rowTitleTone = 'text-neutral-200 group-aria-current:text-neutral-100 group-aria-selected:text-neutral-100'

const rowTitleLook = [rowTitleSize, rowTitleTone]

export const rowNameLook = [rowTitleSize, 'text-neutral-100']

export const rowTitle = (...children: Child[]) => span({ class: ['min-w-0 truncate', rowTitleLook] }, ...children)

export const largeRowTitle = (...children: Child[]) => span({ class: ['min-w-0 truncate text-base font-medium', rowTitleTone] }, ...children)

export const rowName = (...children: Child[]) => span({ class: ['min-w-0 truncate', rowNameLook] }, ...children)

export const plainRowTitle = (...children: Child[]) => span({ class: ['min-w-0 truncate', rowTitleSize] }, ...children)

export const metaLook = 'text-xs text-neutral-500'

export const metaLine = (...children: Child[]) => span({ class: ['min-w-0 truncate', metaLook] }, ...children)

export const colorLabel = (color: MaybeReactive<string | undefined>, ...children: Child[]) =>
  span({ class: 'min-w-0 truncate text-xs font-medium text-neutral-100', style: () => (read(color) ? { color: read(color) } : null) }, ...children)

export const monoMeta = (...children: Child[]) => span({ class: ['min-w-0 truncate font-mono', metaLook] }, ...children)

const keyNames: Record<string, [mac: string, other: string]> = {
  mod: ['⌘', 'Ctrl'],
  cmd: ['⌘', 'Win'],
  meta: ['⌘', 'Win'],
  ctrl: ['⌃', 'Ctrl'],
  control: ['⌃', 'Ctrl'],
  alt: ['⌥', 'Alt'],
  option: ['⌥', 'Alt'],
  shift: ['⇧', 'Shift'],
  enter: ['↵', 'Enter'],
  escape: ['Esc', 'Esc'],
  backspace: ['⌫', 'Backspace'],
  space: ['Space', 'Space'],
  arrowup: ['↑', '↑'],
  arrowdown: ['↓', '↓'],
  arrowleft: ['←', '←'],
  arrowright: ['→', '→'],
}

const keyName = (key: string, mac: boolean) => keyNames[key.toLowerCase()]?.[mac ? 0 : 1] ?? (key.length === 1 ? key.toUpperCase() : key[0]!.toUpperCase() + key.slice(1))

export const chordLabel = (keys: string, mac = isMac()) => {
  const plus = keys.lastIndexOf('+', keys.length - 2)
  const parts = plus > 0 ? [...keys.slice(0, plus).split('+'), keys.slice(plus + 1)] : [keys]
  return parts.map(key => keyName(key, mac)).join(mac ? '' : ' ')
}

export const shortcutHint = (keys: string) => span({ class: 'shrink-0 text-xs font-medium text-neutral-600' }, chordLabel(keys))

const splitPath = (path: string) => {
  const cut = path.lastIndexOf('/') + 1
  return { folder: path.slice(0, cut), name: path.slice(cut) }
}

export const pathLabel = (path: () => string) =>
  span(
    { class: 'flex min-w-0', title: path },
    span({ class: 'min-w-0 truncate text-neutral-500' }, () => splitPath(path()).folder),
    span({ class: 'shrink-0 text-neutral-100' }, () => splitPath(path()).name),
  )

export const countMark = (value: MaybeReactive<number>) => span({ class: ['shrink-0 font-normal tabular-nums', metaLook] }, () => String(read(value)))
