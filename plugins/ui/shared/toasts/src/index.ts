import type { Notify } from '@sand/protocol'
import { div, dynamicChild, floating, layer, list, place, sig } from '@sand/dom'
import { definePlugin } from 'drydock'
import { reportView, type Report } from './report'
import { toastView, type Toast } from './toast'

const maxShown = 4

const withRoom = (toasts: Toast[]) => {
  if (toasts.length <= maxShown) return toasts
  const dropped = toasts.findLast(toast => toast.level !== 'error') ?? toasts.at(-1)
  return withRoom(toasts.filter(toast => toast !== dropped))
}

export default definePlugin({
  name: 'toasts',
  description: 'Shows notices as toasts at the top right of the conversation, and reports in a sheet that stays until closed',
  uses: { layout: 'toasts sit loose on the stage instead of over the conversation' },
  apply(ctx) {
    const toasts = sig<Toast[]>([])
    const report = sig<Report | undefined>(undefined)
    let next = 0
    const close = (toast: Toast) => toasts.update(current => current.filter(other => other !== toast))

    place(ctx, 'main', () =>
      div(
        { class: [layer.toast, 'pointer-events-none absolute inset-0 flex justify-end px-3 pt-12'] },
        list(
          toasts,
          toast => toast.id,
          toast => toastView(toast, close),
          div({ class: 'mt-2 flex w-full max-w-sm flex-col gap-2', 'aria-live': 'polite' }),
        ),
      ),
    )

    floating(ctx, () => dynamicChild(report, shown => (shown ? reportView(shown, () => report.set(undefined)) : div({ hidden: true }))))

    const notify: Notify = {
      push(text, { level = 'info', action, timeout } = {}) {
        toasts.update(current => withRoom([{ id: next++, text, level, action, timeout }, ...current]))
      },
      report: (title, rows) => report.set({ title, rows }),
    }

    ctx.provide('notify', notify)
  },
})
