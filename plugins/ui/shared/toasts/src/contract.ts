import type { BannerTone } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { service, type Context } from 'drydock'

export interface ToastAction {
  label: string
  primary?: boolean
  run(): void | Promise<void>
}

export interface Toast {
  id?: string
  tone: BannerTone
  title: string
  detail?: string
  output?: string
  actions?: ToastAction[]
  sticky?: boolean
}

export interface ToastHandle {
  update(patch: Partial<Toast>): void
  dismiss(): void
}

export interface Failure {
  id?: string
  actions?: ToastAction[]
}

export interface Toasts {
  show(toast: Toast): ToastHandle
  error(title: string, error: unknown, more?: Failure): ToastHandle
  attempt<T>(title: string, run: () => Promise<T>, more?: Failure): Promise<T | undefined>
}

export interface ToastStack {
  show(toast: Toast): ToastHandle
}

export const toasts = service<ToastStack>('toasts')

const unseen: ToastHandle = { update() {}, dismiss() {} }

const failureToast = (title: string, error: unknown, { id = title, actions }: Failure = {}): Toast => ({
  id,
  tone: 'danger',
  sticky: true,
  title,
  detail: errorMessage(error),
  ...(actions && { actions }),
})

export const toastsOf = (ctx: Context): Toasts => {
  const show = (toast: Toast) => ctx.get(toasts)?.show(toast) ?? unseen
  const error = (title: string, failure: unknown, more?: Failure) => {
    const stack = ctx.get(toasts)
    if (stack) return stack.show(failureToast(title, failure, more))
    ctx.report(failure)
    return unseen
  }
  return {
    show,
    error,
    async attempt(title, run, more) {
      try {
        return await run()
      } catch (failure) {
        error(title, failure, more)
        return undefined
      }
    },
  }
}
