import { errorMessage } from '@sand/util'
import type { Toast, ToastAction, ToastHandle, Toasts } from './contract'

export const failureToasts = (show: (toast: Toast) => ToastHandle): Pick<Toasts, 'error' | 'attempt'> => {
  const error = (id: string, title: string, failure: unknown, actions?: ToastAction[]) =>
    show({ id, tone: 'danger', sticky: true, title, detail: errorMessage(failure), actions })

  return {
    error,
    async attempt(id, title, run) {
      try {
        return await run()
      } catch (failure) {
        error(id, title, failure)
        return undefined
      }
    },
  }
}
