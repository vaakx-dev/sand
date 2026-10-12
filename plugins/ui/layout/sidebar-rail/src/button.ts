import { navTip } from '@sand/kit'
import { intent, type NavEntries } from '@sand/kit/web'
import type { NavAction, NavEntry, NavItem } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { initials, projectColor } from './avatar'

const shape = (narrow: Sig<boolean>, selected: () => boolean) => () => [
  'relative flex shrink-0 items-center gap-3 rounded-lg transition-colors',
  narrow.get() ? 'h-10 w-full justify-start px-2' : 'h-8 w-8 justify-center',
  selected() ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100',
]

const label = (narrow: Sig<boolean>, strong: () => boolean, text: () => string) =>
  span({ class: () => (narrow.get() ? ['min-w-0 flex-1 truncate text-left text-sm', strong() ? 'font-semibold text-neutral-100' : ''] : 'hidden') }, text)

const corner = { transform: 'translate(50%, -50%)' }

const badge = (kit: Kit, item: NavItem) => {
  const { navMark } = kit
  const mark = navMark(item, 10)
  if (!mark) return null
  return span({ class: 'absolute top-0 right-0 flex rounded-full bg-neutral-950 ring-2 ring-neutral-950', style: corner }, mark)
}

const avatar = (item: NavItem) =>
  span(
    { class: 'flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-neutral-50', style: { background: projectColor(item.project ?? item.title) } },
    initials(item.title),
  )

export const actionButton = ({ navActionIcon, plainButton }: Kit, action: Sig<NavAction>, narrow: Sig<boolean>, run: (action: NavAction) => void, busy: (id: string) => boolean) =>
  plainButton(
    {
      class: shape(narrow, () => false),
      title: action.map(value => value.label),
      onClick: () => run(action.get()),
    },
    navActionIcon(action, busy),
    label(narrow, () => false, () => action.get().label),
  )

export const itemButton = (kit: Kit, entry: Sig<NavEntry>, narrow: Sig<boolean>, drag: NavEntries['drag']) => {
  const { plainButton } = kit
  const item = entry.map(value => value.item)
  const selected = () => entry.get().selected
  return plainButton(
    { class: shape(narrow, selected), title: item.map(navTip), onClick: () => entry.get().pick(), ...intent(() => entry.get().list.prefetch?.(entry.get().item.id)), ...drag(() => entry.get()) },
    span(
      { class: 'relative flex shrink-0' },
      dynamicChild(
        item.map(value => `${value.project ?? value.title}|${value.title}`),
        () => avatar(item.get()),
      ),
      dynamicChild(
        item.map(value => `${value.state}|${value.unread}`),
        () => badge(kit, item.get()),
      ),
    ),
    label(narrow, () => selected() || Boolean(item.get().unread), () => item.get().title),
  )
}

export const separator = (narrow: Sig<boolean>) => div({ class: () => ['my-2 h-px shrink-0 bg-neutral-700', narrow.get() ? 'mx-2' : 'w-6'] })
