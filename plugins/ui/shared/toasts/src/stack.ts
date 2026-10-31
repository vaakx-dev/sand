import type { Kit } from '@sand/ui-kit/contract'
import { div, list } from '@vaakx-dev/vrui'
import { toastCard } from './card'
import type { ToastModel } from './model'

export const toastStack = (kit: Kit, model: ToastModel) =>
  list(
    model.visible,
    entry => entry.key,
    item => {
      const entry = item.get()
      return toastCard(kit, entry, () => model.dismiss(entry))
    },
    div({ class: [kit.layer.tooltip, 'pointer-events-none fixed inset-x-0 bottom-4 flex flex-col items-center gap-2 px-3'] }),
  )
