import { div, read, span, type Child, type MaybeReactive } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { closeButton } from '../buttons/close'
import { placeLook } from '../surface'

export interface TabProps {
  title: MaybeReactive<string>
  selected: MaybeReactive<boolean>
  onSelect(): void
  lead?: Child
  onClose?: () => void
}

const shape = 'flex h-8 max-w-48 shrink-0 items-center gap-2 rounded-md text-sm transition-colors'

const label = (title: MaybeReactive<string>, lead: Child) => [
  lead ? span({ class: 'inline-flex shrink-0' }, lead) : null,
  span({ class: 'min-w-0 truncate' }, () => read(title)),
]

export const tabStrip = (name: string, ...tabs: Child[]) =>
  div({ role: 'tablist', 'aria-label': name, class: 'flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-none' }, ...tabs)

export const tab = ({ title, selected, onSelect, lead, onClose }: TabProps) => {
  const press = { role: 'tab', 'aria-selected': () => String(read(selected)), title, onClick: () => onSelect() }
  if (!onClose) return plainButton({ ...press, class: [shape, 'px-2', placeLook(selected)] }, ...label(title, lead))
  return div(
    { class: [shape, 'pr-1', placeLook(selected)] },
    plainButton({ ...press, class: 'flex h-full min-w-0 flex-1 items-center gap-2 rounded-md pl-2' }, ...label(title, lead)),
    closeButton({ size: 'sm', surface: 'raised', title: 'Close tab', onClick: () => onClose() }),
  )
}
