import { button, span, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { read } from '../reactive/read'

export const toggleSwitch = ({ on, class: extra, ...props }: Props<HTMLButtonElement> & { on: MaybeReactive<boolean> }) =>
  button(
    {
      type: 'button',
      role: 'switch',
      'aria-checked': () => read(on),
      ...props,
      class: [
        'inline-flex h-5 w-8 shrink-0 items-center rounded-full p-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500 transition-colors disabled:cursor-default disabled:opacity-50',
        () => (read(on) ? 'justify-end bg-accent-500' : 'justify-start bg-neutral-600'),
        extra,
      ],
    },
    span({ class: 'h-3 w-3 rounded-full bg-white' }),
  )
