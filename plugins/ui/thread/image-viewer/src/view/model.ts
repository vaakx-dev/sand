import type { ThreadImage } from '../gallery'
import { derive, sig } from '@vaakx-dev/vrui'

export const viewerModel = (images: ThreadImage[], start: number) => {
  const current = sig(start)
  const go = (index: number) => {
    if (index >= 0 && index < images.length) current.set(index)
  }
  return {
    images,
    current,
    go,
    step: (by: number) => go(current.get() + by),
    atFirst: derive(() => current.get() === 0),
    atLast: derive(() => current.get() === images.length - 1),
  }
}

export type ViewerModel = ReturnType<typeof viewerModel>
