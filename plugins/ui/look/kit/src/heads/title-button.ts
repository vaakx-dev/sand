import { h1, span, type Child, type Props } from '@vaakx-dev/vrui'
import { plainButton } from '../buttons/button'
import { icon } from '../icons/lucide'
import { barTitleLook } from './text'

export const titleButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, title: Child) =>
  h1(
    { class: [barTitleLook, 'flex'] },
    plainButton(
      { ...props, class: ['group flex max-w-full min-w-0 items-center gap-1 rounded-sm', extra] },
      span({ class: 'min-w-0 truncate' }, title),
      span({ class: 'inline-flex shrink-0 text-neutral-500 group-hover:text-neutral-100' }, icon('down', 14)),
    ),
  )
