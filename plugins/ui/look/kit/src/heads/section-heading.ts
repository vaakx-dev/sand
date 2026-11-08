import { h2, span, type Child } from '@vaakx-dev/vrui'
import { iconButton } from '../buttons/button'
import { icon, type IconName } from '../icons/lucide'

export interface HeadingAction {
  icon: IconName
  label: string
  onClick(): void
}

export const groupLabelLook = 'text-xs font-medium text-neutral-500'

export const sectionHeading = (...children: Child[]) =>
  h2({ class: ['flex min-w-0 items-center gap-2 px-2 pt-5 pb-1.5', groupLabelLook] }, ...children)

export const groupHeading = (label: Child, action?: HeadingAction) =>
  sectionHeading(
    span({ class: 'min-w-0 flex-1 truncate' }, label),
    action ? iconButton({ size: 'sm', title: action.label, 'aria-label': action.label, class: '-my-1 -mr-1', onClick: () => action.onClick() }, icon(action.icon, 'sm')) : null,
  )
