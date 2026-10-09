import type { NotifyAction } from '@sand/protocol'
import { copyButton, div, icon, iconButton, onTimeout, primaryAction, span, untrack, type Sig } from '@sand/dom'

export interface Toast {
  id: number
  text: string
  level: string
  action?: NotifyAction
  timeout?: number
}

const lifetime = ({ text, action }: Toast) => Math.min(15000, (action ? 6000 : 3200) + text.length * 30)

const staysOpen = (toast: Toast) => toast.level === 'error' && toast.timeout === undefined

const actionButton = (action: NotifyAction, done: () => void) =>
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

export const toastView = (entry: Sig<Toast>, close: (toast: Toast) => void) => {
  const toast = untrack(() => entry.get())
  const error = toast.level === 'error'
  let cancel: (() => void) | undefined
  const wait = () => {
    cancel?.()
    if (!staysOpen(toast)) cancel = onTimeout(() => close(toast), toast.timeout ?? lifetime(toast))
  }
  wait()
  return div(
    {
      class: 'pointer-events-auto flex w-full cursor-default items-start gap-2 rounded-xl bg-neutral-800 py-2 pr-2 pl-3 text-sm text-neutral-100 shadow-xl ring-1 ring-neutral-700 animate-rise',
      role: error ? 'alert' : 'status',
      onMouseEnter: () => cancel?.(),
      onMouseLeave: wait,
    },
    error && span({ class: 'mt-1 flex h-5 shrink-0 items-center text-danger-400' }, icon('alert', 15)),
    div(
      { class: 'min-w-0 flex-1 py-1' },
      span({ class: 'block max-h-48 overflow-auto whitespace-pre-wrap wrap-anywhere' }, toast.text),
      (error || toast.action) &&
        div(
          { class: 'mt-2 flex items-center gap-1' },
          toast.action && actionButton(toast.action, () => close(toast)),
          error && copyButton({ text: () => toast.text, label: 'Copy error' }),
        ),
    ),
    iconButton({ size: 'sm', title: 'Dismiss', onClick: () => close(toast) }, icon('x', 13)),
  )
}
