import { button, read, span, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { focusRing } from '../surface'

export const toggleSwitch = ({ on, class: extra, ...props }: Props<HTMLButtonElement> & { on: MaybeReactive<boolean> }) =>
  button(
    {
      type: 'button',
      role: 'switch',
      'aria-checked': () => read(on),
      ...props,
      class: [
        'group inline-flex h-5 w-8 shrink-0 items-center rounded-full p-1 cursor-pointer transition-colors disabled:pointer-events-none disabled:bg-neutral-600',
        focusRing,
        () => (read(on) ? 'justify-end bg-accent-500' : 'justify-start bg-neutral-600'),
        extra,
      ],
    },
    span({ class: 'h-3 w-3 rounded-full bg-white group-disabled:bg-white/40' }),
  )
