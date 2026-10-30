import { place } from '@sand/layout/place'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { div, onTimeout, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

type ToastTone = 'ok' | 'bad'

interface Toast {
  id: number
  text: string
  tone: ToastTone
}

const okLife = 5000
const badLife = 10_000

const toastRow = (kit: Kit, toast: Sig<Toast>, close: () => void) => {
  const { closeButton, icon } = kit
  const { text, tone } = toast.get()
  onTimeout(close, tone === 'ok' ? okLife : badLife)
  return div(
    {
      role: tone === 'ok' ? 'status' : 'alert',
      class: 'pointer-events-auto flex max-w-md items-center gap-2 rounded-xl bg-neutral-800 px-3 py-2 text-sm text-neutral-100 shadow-xl ring-1 ring-neutral-700 animate-rise',
    },
    span({ class: ['inline-flex shrink-0', tone === 'ok' ? 'text-success-400' : 'text-danger-400'] }, icon(tone === 'ok' ? 'check' : 'alert', 'md')),
    span({ class: 'min-w-0 flex-1 wrap-anywhere' }, text),
    closeButton({ title: 'Dismiss', size: 'sm', surface: 'raised', onClick: close }),
  )
}

export const createToasts = (ctx: Context, kit: Kit) => {
  const items = sig<Toast[]>([])
  let next = 0
  const remove = (id: number) => items.update(all => all.filter(item => item.id !== id))
  const add = (text: string, tone: ToastTone) => items.update(all => [...all.slice(-2), { id: ++next, text, tone }])

  place(
    ctx,
    'overlay',
    () =>
      div(
        { class: [kit.layer.tooltip, 'pointer-events-none fixed inset-x-0 bottom-4 flex flex-col items-center gap-2 px-3'] },
        kit.rowList(items, item => item.id, item => toastRow(kit, item, () => remove(item.get().id))),
      ),
    300,
  )

  const fail = (what: string, error: unknown) => add(`${what}: ${errorMessage(error).replace(/\.$/, '')}.`, 'bad')

  return {
    ok: (text: string) => add(text, 'ok'),
    bad: (text: string) => add(text, 'bad'),
    fail,
    attempt: <T>(what: string, task: Promise<T>) =>
      task.catch((error: unknown) => {
        fail(what, error)
        return undefined
      }),
  }
}

export type Toasts = ReturnType<typeof createToasts>
