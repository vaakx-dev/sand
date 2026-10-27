import { button, type Child, type ClassValue, type MaybeReactive, type Props } from '@vaakx-dev/vrui'
import { focusRing, placeLook, type Surface } from '../surface'

type Size = 'sm' | 'md' | 'lg'

const controlSizes: Record<Size, string> = {
  sm: 'h-6 px-2',
  md: 'h-8 px-3',
  lg: 'h-10 px-3',
}

export type ButtonProps = Props<HTMLButtonElement> & { size?: Size }
export type ToggleProps = ButtonProps & { active?: MaybeReactive<boolean>; surface?: Surface }

export const plainButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  button(
    {
      type: 'button',
      ...props,
      class: ['cursor-pointer disabled:pointer-events-none disabled:text-neutral-500', focusRing, extra],
    },
    ...children,
  )

export const controlButton = (tone: ClassValue, { size = 'md', class: extra, ...props }: ButtonProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: ['inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-colors', controlSizes[size], tone, extra],
    },
    ...children,
  )

export const rowButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  plainButton({ ...props, class: ['flex w-full min-w-0 items-center text-left', extra] }, ...children)

export const actionTones = {
  primary: 'font-medium bg-accent-500 text-accent-950 hover:bg-accent-400 disabled:bg-neutral-700',
  secondary: 'bg-neutral-700/60 text-neutral-100 hover:bg-neutral-700',
  danger: 'bg-danger-500 text-white hover:bg-danger-400 disabled:bg-neutral-700',
}

export const primaryAction = (props: ButtonProps, ...children: Child[]) => controlButton(actionTones.primary, props, ...children)

export const secondaryAction = (props: ButtonProps, ...children: Child[]) => controlButton(actionTones.secondary, props, ...children)

export const dangerAction = (props: ButtonProps, ...children: Child[]) => controlButton(actionTones.danger, props, ...children)

export const quietButton = ({ active = false, surface, ...props }: ToggleProps, ...children: Child[]) =>
  controlButton(placeLook(active, surface), props, ...children)

export const navButton = ({ active = false, surface, class: extra, ...props }: ToggleProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'flex h-8 min-w-0 items-center gap-2 rounded-md px-2 text-sm transition-colors aria-current:font-medium',
        placeLook(active, surface),
        extra,
      ],
    },
    ...children,
  )

export const iconButton = ({ size = 'md', active = false, surface, class: extra, ...props }: ToggleProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'inline-flex shrink-0 items-center justify-center rounded-md transition-colors',
        size === 'sm' ? 'h-6 w-6' : 'h-8 w-8',
        placeLook(active, surface),
        extra,
      ],
    },
    ...children,
  )

export const linkButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  plainButton({ ...props, class: ['shrink-0 rounded-sm text-neutral-400 underline hover:text-neutral-100', extra] }, ...children)
