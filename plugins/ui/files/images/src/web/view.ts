import type { FileViewer, PictureLook } from '@sand/file-viewer/contract'
import type { Choice, Kit } from '@sand/ui-kit/contract'
import { canvas, div, sig, span } from '@vaakx-dev/vrui'
import type { Decoded } from './decoder/answer'

interface Parts {
  kit: Kit
  viewer: FileViewer
}

type Zoom = 'fit' | 'actual'

const ZOOMS: Choice<Zoom>[] = [
  { value: 'fit', label: 'Fit' },
  { value: 'actual', label: 'Actual size' },
]

const sizeLabel = ({ width, height, pages }: Decoded) => {
  const size = `${width.toLocaleString('en')} × ${height.toLocaleString('en')}`
  return pages > 1 ? `${size} · page 1 of ${pages}` : size
}

const pictureCanvas = (name: string, decoded: Decoded, look: PictureLook) => {
  const node = canvas({ width: decoded.width, height: decoded.height, role: 'img', 'aria-label': name, ...look })
  node.getContext('bitmaprenderer')?.transferFromImageBitmap(decoded.image)
  return node
}

const pictureView = ({ kit, viewer }: Parts, name: string, decoded: Decoded) => {
  const zoom = sig<Zoom>('fit')
  const actual = () => zoom.get() === 'actual'
  const choose = (value: Zoom) => zoom.set(value)
  return div(
    { class: 'flex flex-1 flex-col' },
    div(
      { class: 'flex flex-wrap items-center justify-between gap-2 px-3 pt-3' },
      span({ class: 'text-xs text-neutral-500 tabular-nums' }, sizeLabel(decoded)),
      kit.segmented(ZOOMS, zoom, choose, { label: 'Zoom' }),
    ),
    viewer.picture({ actual, toggle: () => choose(actual() ? 'fit' : 'actual'), element: look => pictureCanvas(name, decoded, look) }),
  )
}

export { pictureView }
