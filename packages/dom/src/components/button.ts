import { button, type Child, type ClassValue, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { read } from '../reactive/read'

type Size = 'sm' | 'md'

export type ButtonProps = Props<HTMLButtonElement> & { size?: Size }
export type ToggleProps = ButtonProps & { active?: MaybeReactive<boolean> }

const sizes: Record<Size, string> = {
  sm: 'h-6 rounded-md px-2 text-xs',
  md: 'h-8 rounded-lg px-3 text-sm',
}

const squares: Record<Size, string> = {
  sm: 'h-6 w-6 rounded-md',
  md: 'h-8 w-8 rounded-lg',
}

const focusable = 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:pointer-events-none disabled:opacity-50'

const toggled = (active: MaybeReactive<boolean>, rest: string) => () => (read(active) ? 'bg-neutral-700 text-neutral-100' : rest)

export const controlButton = (tone: ClassValue, { size = 'md', class: extra, ...props }: ButtonProps, ...children: Child[]) =>
  button(
    {
      type: 'button',
      ...props,
      class: ['inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors', focusable, sizes[size], tone, extra],
    },
    ...children,
  )

export const rowButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  button({ type: 'button', ...props, class: ['flex w-full min-w-0 items-center text-left', focusable, extra] }, ...children)

export const primaryAction = (props: ButtonProps, ...children: Child[]) =>
  controlButton('font-medium bg-accent-500 text-white hover:bg-accent-600', props, ...children)

export const secondaryAction = (props: ButtonProps, ...children: Child[]) =>
  controlButton('font-medium bg-neutral-700 text-neutral-100 hover:bg-neutral-600', props, ...children)

export const quietButton = ({ active = false, ...props }: ToggleProps, ...children: Child[]) =>
  controlButton(toggled(active, 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300'), props, ...children)

export const navButton = ({ active = false, class: extra, ...props }: ToggleProps, ...children: Child[]) =>
  button(
    {
      type: 'button',
      ...props,
      class: [
        'flex h-8 min-w-0 items-center gap-2 rounded-lg px-2 text-sm transition-colors',
        focusable,
        toggled(active, 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300'),
        extra,
      ],
    },
    ...children,
  )

export const iconButton = ({ size = 'md', active = false, class: extra, ...props }: ToggleProps, ...children: Child[]) =>
  button(
    {
      type: 'button',
      ...props,
      class: [
        'inline-flex shrink-0 items-center justify-center transition-colors',
        focusable,
        squares[size],
        toggled(active, 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'),
        extra,
      ],
    },
    ...children,
  )
