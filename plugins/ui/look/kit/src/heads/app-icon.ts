import { dynamicChild, el, img, span, type Props, type Sig } from '@vaakx-dev/vrui'
import { iconButton } from '../buttons/button'
import { icon } from '../icons/lucide'
import { paneHead } from './page-head'

export const appIcon = (size = 20) =>
  img({ src: `/icons/${size > 32 ? '128x128@2x.png' : '64x64.png'}`, alt: '', width: size, height: size, draggable: false, class: 'shrink-0' })

const sidebarToggle = (props: Props<HTMLButtonElement>) =>
  iconButton(
    { ...props, class: ['group', props.class] },
    span({ class: 'flex group-hover:hidden group-focus-visible-within:hidden' }, appIcon(20)),
    span({ class: 'hidden group-hover:flex group-focus-visible-within:flex' }, icon('sidebar')),
  )

export const showSideButton = (narrow: Sig<boolean>, label: string, onClick: () => void) =>
  dynamicChild(narrow, value =>
    value ? iconButton({ title: label, 'aria-label': label, onClick }, appIcon(20)) : sidebarToggle({ title: 'Show the sidebar', 'aria-label': 'Show the sidebar', onClick }),
  )

const iconSlot = () => span({ class: 'inline-flex h-8 w-8 shrink-0 items-center justify-center' }, appIcon(20))

export const sideHead = (title: string, hide?: () => void) =>
  paneHead(
    { led: true },
    hide ? sidebarToggle({ title: 'Hide the sidebar', 'aria-label': 'Hide the sidebar', onClick: hide }) : iconSlot(),
    el('b', { class: 'text-sm font-semibold text-neutral-300', style: { textBox: 'trim-both cap alphabetic' } }, title),
  )
