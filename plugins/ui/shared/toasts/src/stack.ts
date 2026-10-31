import type { Kit } from '@sand/ui-kit/contract'
import { div, list } from '@vaakx-dev/vrui'
import { toastCard } from './card'
import type { ToastModel } from './model'

const placement = (narrow: boolean) => (narrow ? 'inset-x-3 bottom-32' : 'right-4 bottom-4 w-96')

export const toastStack = (kit: Kit, model: ToastModel, narrow: () => boolean) =>
  list(
    model.visible,
    entry => entry.key,
    item => {
      const entry = item.get()
      return toastCard(kit, entry, () => model.dismiss(entry))
    },
    div({ class: () => [kit.layer.drawer, 'pointer-events-none fixed flex flex-col gap-2', placement(narrow())] }),
  )
