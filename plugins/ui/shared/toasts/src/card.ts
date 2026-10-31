import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, effect, onTimeout, sig, span } from '@vaakx-dev/vrui'
import type { Toast } from './contract'
import { isSticky, type Entry } from './model'
import { actionRow, outputBlock, toneMark } from './parts'

const autoDismissMs = 6000

const autoDismiss = (entry: Entry, paused: () => boolean, dismiss: () => void) =>
  effect(() => {
    if (isSticky(entry.toast.get()) || paused()) return
    onTimeout(dismiss, autoDismissMs)
  })

const isOneLine = ({ detail, output, actions }: Toast) => !detail && !output && !actions?.length

export const toastCard = (kit: Kit, entry: Entry, dismiss: () => void) => {
  const hovered = sig(false)
  const focused = sig(false)
  const toast = () => entry.toast.get()
  autoDismiss(entry, () => hovered.get() || focused.get(), dismiss)
  return div(
    {
      role: () => (toast().tone === 'danger' ? 'alert' : 'status'),
      class: [
        'pointer-events-auto flex max-w-md gap-2 rounded-xl bg-neutral-800 px-3 py-2 text-sm text-neutral-100 shadow-xl ring-1 ring-neutral-700 animate-rise',
        () => (isOneLine(toast()) ? 'items-center' : 'items-start'),
      ],
      onMouseEnter: () => hovered.set(true),
      onMouseLeave: () => hovered.set(false),
      onFocusIn: () => focused.set(true),
      onFocusOut: () => focused.set(false),
    },
    dynamicChild(() => toast().tone, tone => toneMark(kit, tone)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col gap-1' },
      span({ class: 'wrap-anywhere' }, () => toast().title),
      dynamicChild(() => toast().detail, detail => (detail ? span({ class: 'text-xs text-neutral-400 wrap-anywhere whitespace-pre-wrap' }, detail) : null)),
      dynamicChild(() => toast().output, output => (output ? outputBlock(kit, output) : null)),
      dynamicChild(() => toast().actions, actions => (actions?.length ? actionRow(kit, actions, dismiss) : null)),
    ),
    kit.closeButton({ title: 'Dismiss', size: 'sm', surface: 'raised', onClick: dismiss }),
  )
}
