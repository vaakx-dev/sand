import type { ContextMenu, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { duration } from '@sand/util'
import { div, keys, show, span, type Child, type ClassValue, type Sig } from '@vaakx-dev/vrui'
import type { Run } from '../runs/runs'

export interface Actions {
  open(id: string): void
  cancel(run: Run): Promise<boolean>
  copy(text: string): void
}

export interface Rows extends Actions {
  menu: ContextMenu
  kit: Kit
}

interface Pressable {
  class: ClassValue
  press(): void
  enabled: () => boolean
  menu: { on: ContextMenu; spec: () => MenuSpec | undefined }
}

export const meta = (...children: Child[]) => span({ class: 'shrink-0 text-xs tabular-nums text-neutral-500' }, ...children)

export const since = (started: number, ended: number | undefined, now: number) => duration(Math.max(0, (ended ?? now) - started))

export const headline = (run: Sig<Run>) => div({ class: 'truncate text-sm text-neutral-100', title: run.map(value => value.title) }, run.map(value => value.title))

export const subline = (text: () => string) => div({ class: 'truncate text-xs tabular-nums text-neutral-500' }, text)

export const noteLine = (text: Sig<string | undefined>, tone: string) =>
  show(
    text.map(Boolean),
    () => div({ class: ['truncate text-xs', tone], title: () => text.get() ?? '' }, () => text.get() ?? ''),
  )

export const markSlot = (...children: Child[]) => div({ class: 'flex h-5 shrink-0 items-center' }, ...children)

export const pressable = ({ class: extra, press, enabled, menu }: Pressable, ...children: Child[]) => {
  const run = () => {
    if (enabled()) press()
  }
  return div(
    {
      ...menu.on.target(menu.spec, run),
      role: () => (enabled() ? 'button' : undefined),
      tabIndex: () => (enabled() ? 0 : -1),
      class: [
        'w-full rounded-lg outline-none transition-colors',
        () => (enabled() ? 'cursor-pointer hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-accent-500' : ''),
        extra,
      ],
      onKeyDown: keys({ Enter: run, ' ': run }, { self: true }),
    },
    ...children,
  )
}
