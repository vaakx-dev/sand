import { derive, div, resizeObserver, sig, type Child, type Props } from '@vaakx-dev/vrui'
import { ZoomControl } from './control'

interface Size {
  width: number
  height: number
}

interface FitZoomOptions {
  readableLevel?: number
}

const STAGE_MARGIN = 24

const fitZoom = (size: Size, { readableLevel = 0 }: FitZoomOptions = {}) => {
  const room = sig<Size>({ width: 0, height: 0 })
  const fitted = derive(() => {
    const { width, height } = room.get()
    return width ? Math.min((width - 2 * STAGE_MARGIN) / size.width, (height - 2 * STAGE_MARGIN) / size.height) : 1
  })
  const control = new ZoomControl({ fitted, start: derive(() => Math.max(fitted.get(), readableLevel)) })
  return { size, room, control }
}

type FitZoom = ReturnType<typeof fitZoom>

const zoomStage = ({ size, room, control }: FitZoom, props: Props<HTMLDivElement>, ...children: Child[]) => {
  const content = div({ ...props, class: 'm-auto shrink-0', style: { width: `${size.width}px`, height: `${size.height}px`, zoom: () => String(control.level.get()) } }, ...children)
  return div(
    {
      class: 'flex min-h-0 flex-1 overflow-auto',
      onMount: scroller => {
        resizeObserver(scroller, () => room.set({ width: scroller.clientWidth, height: scroller.clientHeight }))
        return control.show({ node: scroller, content, wheel: 'scrolls', moveBy: ({ x, y }) => scroller.scrollBy(-x, -y) })
      },
    },
    content,
  )
}

export { fitZoom, zoomStage }
