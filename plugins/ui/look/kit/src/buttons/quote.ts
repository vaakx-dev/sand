import { span, type Props } from '@vaakx-dev/vrui'
import { plainButton } from './button'

export const quoteButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, text: string) =>
  plainButton(
    { ...props, class: ['flex min-w-0 gap-3 rounded-md text-left text-neutral-400 hover:text-neutral-100', extra] },
    span({ class: 'w-1 shrink-0 rounded-full bg-neutral-700' }),
    span({ class: 'min-w-0 line-clamp-3 whitespace-pre-wrap wrap-anywhere' }, text),
  )
