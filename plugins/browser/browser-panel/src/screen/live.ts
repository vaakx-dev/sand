import { effect, onTimeout, resizeObserver, untrack, type Sig } from '@vaakx-dev/vrui'
import { framePainter } from '../integrations/canvas'
import { streamFrames } from '../integrations/frames'
import type { TabModel } from '../tab/model'
import type { Screen } from './screen'

const resizeMs = 200

const reportSize = (tab: TabModel, screen: Screen, live: () => boolean) =>
  effect(() => {
    const { width, height } = screen.box.get()
    if (!live() || width < 1 || height < 1) return
    return onTimeout(() => {
      const viewport = { width: Math.round(width), height: Math.round(height), scale: Math.min(2, window.devicePixelRatio || 1) }
      const current = untrack(() => tab.state.get())?.viewport
      if (current && current.width === viewport.width && current.height === viewport.height && current.scale === viewport.scale) return
      void tab.resize(viewport).catch(() => undefined)
    }, resizeMs)
  })

const streamWhileLive = (tab: TabModel, screen: Screen, painter: ReturnType<typeof framePainter>, live: () => boolean) =>
  effect(() => {
    const target = tab.key.get()
    if (!target || !live()) return
    return untrack(() =>
      streamFrames(
        signal => tab.frames(target, signal),
        async bytes => {
          const size = await painter.paint(bytes)
          if (size) screen.framed(bytes, size)
        },
        () => void tab.refresh(),
      ),
    )
  })

const clearWhenClosed = (tab: TabModel, screen: Screen, painter: ReturnType<typeof framePainter>) =>
  effect(() => {
    tab.key.get()
    if (tab.open.get()) return
    painter.clear()
    screen.reset()
  })

export const liveCanvas = (node: HTMLCanvasElement, tab: TabModel, screen: Screen, visible: Sig<boolean>) => {
  const painter = framePainter(node)
  const live = () => visible.get() && tab.open.get()
  resizeObserver(node, () => {
    screen.measure(node)
    painter.draw()
  })
  const stops = [reportSize(tab, screen, live), streamWhileLive(tab, screen, painter, live), clearWhenClosed(tab, screen, painter)]
  return () => {
    for (const stop of stops) stop()
    painter.clear()
  }
}
