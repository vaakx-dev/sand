import { derive, sig, type Sig } from '@vaakx-dev/vrui'
import type { Toast, ToastHandle } from './contract'

export interface Entry {
  key: number
  toast: Sig<Toast>
}

const maxVisible = 4

export const isSticky = ({ sticky, tone }: Toast) => sticky ?? tone === 'danger'

export const toastModel = () => {
  const entries = sig<Entry[]>([])
  let nextKey = 0

  const dismiss = (entry: Entry) => entries.update(list => list.filter(item => item !== entry))

  const handle = (entry: Entry): ToastHandle => ({
    update: patch => entry.toast.update(current => ({ ...current, ...patch })),
    dismiss: () => dismiss(entry),
  })

  const withId = (id: string | undefined) => (id === undefined ? undefined : entries.get().find(entry => entry.toast.get().id === id))

  const show = (toast: Toast): ToastHandle => {
    const found = withId(toast.id)
    if (found) {
      found.toast.set(toast)
      return handle(found)
    }
    const entry = { key: nextKey++, toast: sig(toast) }
    entries.update(list => [...list, entry])
    return handle(entry)
  }

  const visible = derive(() => entries.get().slice(-maxVisible))

  return { visible, show, dismiss }
}

export type ToastModel = ReturnType<typeof toastModel>
