import type { Tone } from '@sand/ui-kit/contract'
import { service } from 'drydock'

export interface ToastAction {
  label: string
  primary?: boolean
  run(): void | Promise<void>
}

export interface Toast {
  id?: string
  tone: Tone
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

export interface Toasts {
  show(toast: Toast): ToastHandle
  error(id: string, title: string, error: unknown, actions?: ToastAction[]): ToastHandle
  attempt<T>(id: string, title: string, run: () => Promise<T>): Promise<T | undefined>
}

export const toasts = service<Toasts>('toasts')
