import type { NotifyAction } from './contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, effect, onTimeout, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'

export interface Toast {
  id: number
  text: string
  level: string
  action?: NotifyAction
  timeout?: number
}

const lifetime = ({ text, action }: Toast) => Math.min(15000, (action ? 6000 : 3200) + text.length * 30)

const staysOpen = (toast: Toast) => toast.level === 'error' && toast.timeout === undefined

const actionButton = ({ primaryAction }: Kit, action: NotifyAction, done: () => void) =>
  primaryAction(
    {
      size: 'sm',
      onClick: () => {
        action.run()
        done()
      },
    },
    action.label,
  )

export const toastView = (kit: Kit, entry: Sig<Toast>, close: (toast: Toast) => void) => {
  const { closeButton, copyButton, icon } = kit
  const toast = untrack(() => entry.get())
  const error = toast.level === 'error'
  const hovered = sig(false)
  effect(() => {
    if (!hovered.get() && !staysOpen(toast)) onTimeout(() => close(toast), toast.timeout ?? lifetime(toast))
  })
  return div(
    {
      class: 'pointer-events-auto flex w-full cursor-default items-start gap-2 rounded-xl bg-neutral-800 py-2 pr-2 pl-3 text-sm text-neutral-100 shadow-xl ring-1 ring-neutral-700 animate-rise',
      role: error ? 'alert' : 'status',
      onMouseEnter: () => hovered.set(true),
      onMouseLeave: () => hovered.set(false),
    },
    error && span({ class: 'mt-1 flex h-5 shrink-0 items-center text-danger-400' }, icon('alert', 14)),
    div(
      { class: 'min-w-0 flex-1 py-1' },
      span({ class: 'block max-h-48 overflow-auto whitespace-pre-wrap wrap-anywhere' }, toast.text),
      (error || toast.action) &&
        div(
          { class: 'mt-2 flex items-center gap-1' },
          toast.action && actionButton(kit, toast.action, () => close(toast)),
          error && copyButton({ text: () => toast.text, label: 'Copy' }),
        ),
    ),
    closeButton({ title: 'Dismiss', size: 'sm', onClick: () => close(toast) }),
  )
}
