import type { Picture } from '../gallery'
import { ZoomControl, type ZoomRange } from '@sand/ui-kit/contract'
import { derive, sig } from '@vaakx-dev/vrui'

const IMAGE_ZOOM: ZoomRange = { least: 1, most: 8, step: 1.5, doubleTap: 2.5 }

export const viewerModel = (images: Picture[], start: number) => {
  const current = sig(start)
  const zoom = new ZoomControl({ range: IMAGE_ZOOM })
  const go = (index: number) => {
    if (index < 0 || index >= images.length) return
    current.set(index)
    zoom.fit()
  }
  return {
    images,
    current,
    zoom,
    go,
    step: (by: number) => go(current.get() + by),
    first: () => go(0),
    last: () => go(images.length - 1),
    atFirst: derive(() => current.get() === 0),
    atLast: derive(() => current.get() === images.length - 1),
  }
}

export type ViewerModel = ReturnType<typeof viewerModel>
