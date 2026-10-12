import { button, read, type Child, type ClassValue, type MaybeReactive, type Props } from '@vaakx-dev/vrui'

type Size = 'sm' | 'md' | 'lg'

const controlSizes: Record<Size, string> = {
  sm: 'h-6 rounded-md px-2 text-xs',
  md: 'h-8 rounded-lg px-3 text-sm',
  lg: 'h-10 rounded-xl px-3 text-sm',
}

export type ButtonProps = Props<HTMLButtonElement> & { size?: Size }
export type ToggleProps = ButtonProps & { active?: MaybeReactive<boolean> }

const quietHover = 'hover:bg-neutral-800 hover:text-neutral-100'

export const quietLook =
  (active: MaybeReactive<boolean>, idle: MaybeReactive<string> = 'text-neutral-400') =>
  () =>
    read(active) ? 'bg-neutral-700 text-neutral-100' : `${read(idle)} ${quietHover}`

export const plainButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  button(
    {
      type: 'button',
      ...props,
      class: ['cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:pointer-events-none disabled:opacity-50', extra],
    },
    ...children,
  )

export const controlButton = (tone: ClassValue, { size = 'md', class: extra, ...props }: ButtonProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors',
        controlSizes[size],
        tone,
        extra,
      ],
    },
    ...children,
  )

export const rowButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  plainButton({ ...props, class: ['flex w-full min-w-0 items-center text-left', extra] }, ...children)

export const actionTones = {
  primary: 'font-medium bg-accent-500 text-neutral-950 hover:bg-accent-600',
  secondary: 'font-medium bg-neutral-700 text-neutral-100 hover:bg-neutral-600',
  danger: 'font-medium bg-danger-500 text-white hover:bg-danger-600',
}

export const primaryAction = (props: ButtonProps, ...children: Child[]) => controlButton(actionTones.primary, props, ...children)

export const secondaryAction = (props: ButtonProps, ...children: Child[]) => controlButton(actionTones.secondary, props, ...children)

export const dangerAction = (props: ButtonProps, ...children: Child[]) => controlButton(actionTones.danger, props, ...children)

export const quietButton = ({ active = false, ...props }: ToggleProps, ...children: Child[]) => controlButton(quietLook(active), props, ...children)

export const navButton = ({ active = false, class: extra, ...props }: ToggleProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: ['flex h-8 min-w-0 items-center gap-2 rounded-lg px-2 text-sm transition-colors', quietLook(active), extra],
    },
    ...children,
  )

export const iconButton = ({ size = 'md', active = false, class: extra, ...props }: ToggleProps, ...children: Child[]) =>
  plainButton(
    {
      ...props,
      class: [
        'inline-flex shrink-0 items-center justify-center transition-colors',
        size === 'sm' ? 'h-6 w-6 rounded-md' : 'h-8 w-8 rounded-lg',
        quietLook(active),
        extra,
      ],
    },
    ...children,
  )

export const linkButton = ({ class: extra, ...props }: Props<HTMLButtonElement>, ...children: Child[]) =>
  plainButton({ ...props, class: ['shrink-0 text-accent-400 hover:underline', extra] }, ...children)
