import type { Point, UserInput } from '@sand/browser-engine/contract'
import { untrack, type Sig } from '@sand/dom'
import type { TabModel } from '../../tab/model'
import type { Screen } from '../screen'
import { perFrame } from './frame'
import { isPaste, keyInput, modifiers } from './keys'
import { buttonOf, clickCounter, heldButton, mouseInput } from './mouse'
import { touchGesture, type WheelInput } from './touch'

export interface InputParts {
  tab: TabModel
  screen: Screen
  picking: Sig<boolean>
  pickAt(point: Point): void
}

const lineHeight = 16

const mergeWheel = (previous: WheelInput, next: WheelInput): WheelInput => ({
  ...next,
  deltaX: previous.deltaX + next.deltaX,
  deltaY: previous.deltaY + next.deltaY,
})

export const screenInput = ({ tab, screen, picking, pickAt }: InputParts) => {
  let queue = Promise.resolve()
  const send = (input: UserInput) => {
    queue = queue.then(() => tab.input(input)).then(
      () => undefined,
      () => undefined,
    )
  }
  const moves = perFrame<UserInput>(send)
  const wheels = perFrame<WheelInput>(send, mergeWheel)
  const hover = perFrame<Point>(point => void tab.inspect(point).catch(() => undefined))
  const touch = touchGesture(send, (input, owner) => wheels.push(input, owner))
  const clicks = clickCounter()
  let count = 1

  const viewport = () => untrack(() => tab.state.get())?.viewport
  const at = (event: MouseEvent) => {
    const current = viewport()
    return current && screen.toPage(event, event.currentTarget as Element, current)
  }

  const wheelUnit = (event: WheelEvent, node: Element) => {
    const current = viewport()
    if (!current) return 1
    if (event.deltaMode === 1) return lineHeight
    if (event.deltaMode === 2) return current.height
    return screen.ratio(node, current)
  }

  return {
    onPointerDown(event: PointerEvent) {
      const point = at(event)
      if (!point) return
      const node = event.currentTarget as HTMLElement
      event.preventDefault()
      node.focus({ preventScroll: true })
      node.setPointerCapture(event.pointerId)
      if (untrack(() => picking.get())) {
        hover.drop()
        if (event.button === 0) pickAt(point)
        return
      }
      if (event.pointerType === 'touch') return touch.down(event, point)
      moves.flush()
      count = clicks(event)
      send(mouseInput('mousePressed', point, event, buttonOf(event.button), count))
    },
    onPointerMove(event: PointerEvent) {
      const point = at(event)
      if (!point) return
      if (untrack(() => picking.get())) return hover.push(point, event.currentTarget as Node)
      if (event.pointerType === 'touch') return touch.move(event, point)
      moves.push(mouseInput('mouseMoved', point, event, heldButton(event.buttons), 0), event.currentTarget as Node)
    },
    onPointerUp(event: PointerEvent) {
      const point = at(event)
      if (!point || untrack(() => picking.get())) return
      if (event.pointerType === 'touch') return touch.up(event, point)
      moves.flush()
      send(mouseInput('mouseReleased', point, event, buttonOf(event.button), count))
    },
    onPointerCancel: touch.cancel,
    onPointerLeave() {
      if (!untrack(() => picking.get())) return
      hover.drop()
      void tab.inspect().catch(() => undefined)
    },
    onWheel(event: WheelEvent) {
      event.preventDefault()
      const point = at(event)
      if (!point) return
      const node = event.currentTarget as Element
      const unit = wheelUnit(event, node)
      wheels.push({ kind: 'wheel', ...point, deltaX: event.deltaX * unit, deltaY: event.deltaY * unit, modifiers: modifiers(event) }, node)
    },
    onKeyDown(event: KeyboardEvent) {
      if (!viewport() || untrack(() => picking.get()) || isPaste(event) || event.isComposing) return
      event.preventDefault()
      send(keyInput('keyDown', event))
    },
    onKeyUp(event: KeyboardEvent) {
      if (!viewport() || untrack(() => picking.get()) || isPaste(event) || event.isComposing) return
      event.preventDefault()
      send(keyInput('keyUp', event))
    },
    onPaste(event: ClipboardEvent) {
      const text = event.clipboardData?.getData('text/plain')
      if (!text || !viewport()) return
      event.preventDefault()
      send({ kind: 'text', text })
    },
    onContextMenu(event: MouseEvent) {
      event.preventDefault()
    },
  }
}
