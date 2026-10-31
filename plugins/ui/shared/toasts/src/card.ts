import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, effect, onTimeout, sig, span } from '@vaakx-dev/vrui'
import { isSticky, type Entry } from './model'
import { actionRow, outputBlock, toneMark } from './parts'

const autoDismissMs = 6000

const autoDismiss = (entry: Entry, paused: () => boolean, dismiss: () => void) =>
  effect(() => {
    if (isSticky(entry.toast.get()) || paused()) return
    onTimeout(dismiss, autoDismissMs)
  })

export const toastCard = (kit: Kit, entry: Entry, dismiss: () => void) => {
  const hovered = sig(false)
  const focused = sig(false)
  const toast = () => entry.toast.get()
  autoDismiss(entry, () => hovered.get() || focused.get(), dismiss)
  return div(
    {
      role: () => (toast().tone === 'danger' ? 'alert' : 'status'),
      class: 'pointer-events-auto flex min-w-0 flex-col gap-2 rounded-xl bg-neutral-950 p-3 shadow-xl ring-1 ring-neutral-700 animate-fade',
      onMouseEnter: () => hovered.set(true),
      onMouseLeave: () => hovered.set(false),
      onFocusIn: () => focused.set(true),
      onFocusOut: () => focused.set(false),
    },
    div(
      { class: 'flex min-w-0 items-start gap-2' },
      dynamicChild(() => toast().tone, tone => toneMark(kit, tone)),
      div(
        { class: 'flex min-w-0 flex-1 flex-col gap-1' },
        span({ class: 'text-sm font-medium text-neutral-100 break-words' }, () => toast().title),
        dynamicChild(() => toast().detail, detail => (detail ? span({ class: 'text-sm text-neutral-400 wrap-anywhere whitespace-pre-wrap' }, detail) : null)),
      ),
      kit.closeButton({ size: 'sm', title: 'Dismiss', class: '-mr-1', onClick: dismiss }),
    ),
    dynamicChild(() => toast().output, output => (output ? outputBlock(kit, output) : null)),
    dynamicChild(() => toast().actions, actions => (actions?.length ? actionRow(kit, actions, dismiss) : null)),
  )
}
