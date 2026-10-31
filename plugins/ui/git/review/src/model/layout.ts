import { derive, sig, stored } from '@vaakx-dev/vrui'

type DiffLook = 'unified' | 'split'

const splitWidth = 720

export const diffLayout = () => {
  const preferred = stored<DiffLook>('sand.review.view', 'unified')
  const width = sig(0)
  const wide = derive(() => width.get() >= splitWidth)
  return {
    width,
    wide,
    preferSplit: derive(() => preferred.get() === 'split'),
    split: derive(() => wide.get() && preferred.get() === 'split'),
    toggle() {
      preferred.set(preferred.get() === 'split' ? 'unified' : 'split')
    },
  }
}

export type DiffLayout = ReturnType<typeof diffLayout>
