import type { Cdp } from '../chrome'
import type { Point } from '../contract'

export const click = async (cdp: Cdp, { x, y }: Point, count: number) => {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  for (let clickCount = 1; clickCount <= count; clickCount++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount })
  }
}

export const wheel = (cdp: Cdp, { x, y }: Point, deltaX: number, deltaY: number) =>
  cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY })
