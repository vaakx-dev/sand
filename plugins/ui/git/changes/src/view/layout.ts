import { derive, sig, stored } from '@vaakx-dev/vrui'

export type DiffView = 'unified' | 'split'

const splitWidth = 720

export const viewLayout = () => {
  const preferred = stored<DiffView>('sand.changes.view', 'unified')
  const width = sig(0)
  const wide = derive(() => width.get() >= splitWidth)
  const view = derive<DiffView>(() => (wide.get() && preferred.get() === 'split' ? 'split' : 'unified'))
  return {
    preferred,
    width,
    wide,
    view,
    toggle() {
      preferred.set(preferred.get() === 'split' ? 'unified' : 'split')
    },
  }
}

export type ViewLayout = ReturnType<typeof viewLayout>
