import type { Kit } from '@sand/ui-kit/contract'
import { derive, resizeObserver, show, sig, type Sig } from '@vaakx-dev/vrui'
import type { DiffLayout } from '../contract'

export type DiffLook = 'unified' | 'split'

const splitWidth = 720

export const diffLayout = (kit: Kit, preferred: Sig<DiffLook>): DiffLayout => {
  const width = sig(0)
  const wide = derive(() => width.get() >= splitWidth)
  const preferSplit = derive(() => preferred.get() === 'split')
  return {
    split: derive(() => wide.get() && preferSplit.get()),
    measure(element) {
      resizeObserver(element, entries => width.set(entries[0]?.contentRect.width ?? 0))
    },
    splitButton: () =>
      show(wide, () =>
        kit.quietButton(
          { size: 'sm', active: preferSplit, title: 'Show old and new side by side', onClick: () => preferred.set(preferSplit.get() ? 'unified' : 'split') },
          'Split',
        ),
      ),
  }
}
