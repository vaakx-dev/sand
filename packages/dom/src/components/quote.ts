import { span, type Props } from '@vaakx-dev/vrui'
import { plainButton } from './button'

export const quoteButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, text: string) =>
  plainButton(
    { ...props, class: ['flex min-w-0 gap-3 rounded-sm text-left text-neutral-400 hover:text-neutral-200', extra] },
    span({ class: 'w-1 shrink-0 rounded-full bg-accent-500' }),
    span({ class: 'min-w-0 line-clamp-3 whitespace-pre-wrap wrap-anywhere' }, text),
  )
