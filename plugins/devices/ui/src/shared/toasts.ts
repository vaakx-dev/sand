import { toasts } from '@sand/toasts/contract'
import type { Context } from 'drydock'

const toastId = (text: string) => `devices:${text}`

export const createToasts = (ctx: Context) => {
  const shown = () => ctx.get(toasts)

  const fail = (what: string, error: unknown) => {
    const found = shown()
    if (found) found.error(toastId(what), what, error)
    else console.error(`${what}:`, error)
  }

  return {
    ok: (text: string) => void shown()?.show({ tone: 'success', title: text }),
    bad: (text: string) => void shown()?.show({ id: toastId(text), tone: 'danger', title: text }),
    fail,
    attempt: <T>(what: string, task: Promise<T>) =>
      task.catch((error: unknown) => {
        fail(what, error)
        return undefined
      }),
  }
}

export type Toasts = ReturnType<typeof createToasts>
