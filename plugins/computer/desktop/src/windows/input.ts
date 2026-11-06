import type { Action, Key, Point } from '@sand/computers/contract'
import { normalizedOf, pixelOf, type Screen } from './screen'

export type Input = { type: 'mouse'; dx: number; dy: number; data: number; flags: number } | { type: 'key'; vk: number; scan: number; flags: number }

export type InputAction = Exclude<Action, { type: 'wait' | 'open' }>

export type ScanCode = (vk: number) => number

const mouseFlags = { move: 0x1, leftDown: 0x2, leftUp: 0x4, rightDown: 0x8, rightUp: 0x10, wheel: 0x800, hwheel: 0x1000, virtualDesk: 0x4000, absolute: 0x8000 }
const keyFlags = { extended: 0x1, up: 0x2, unicode: 0x4 }
const extendedKeys = new Set([0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x2d, 0x2e, 0x5b])
const wheelDelta = 120
const dragSteps = 8
const enter = 0x0d
const tab = 0x09
export const inputSize = 40

const button = {
  left: { down: mouseFlags.leftDown, up: mouseFlags.leftUp },
  right: { down: mouseFlags.rightDown, up: mouseFlags.rightUp },
}

const mouse = (flags: number, data = 0): Input => ({ type: 'mouse', dx: 0, dy: 0, data, flags })

const moveTo = (at: Point, screen: Screen): Input => {
  const { x, y } = normalizedOf(pixelOf(at, screen), screen)
  return { type: 'mouse', dx: x, dy: y, data: 0, flags: mouseFlags.move | mouseFlags.absolute | mouseFlags.virtualDesk }
}

const clicks = (at: Point, screen: Screen, which: keyof typeof button, count: number): Input[][] => [
  [moveTo(at, screen), ...Array.from({ length: count }, () => [mouse(button[which].down), mouse(button[which].up)]).flat()],
]

const virtualKey = (vk: number, up: boolean, scan: ScanCode): Input => ({
  type: 'key',
  vk,
  scan: scan(vk),
  flags: (extendedKeys.has(vk) ? keyFlags.extended : 0) | (up ? keyFlags.up : 0),
})

const tap = (vk: number, scan: ScanCode) => [virtualKey(vk, false, scan), virtualKey(vk, true, scan)]

const unicode = (unit: number): Input[] => [
  { type: 'key', vk: 0, scan: unit, flags: keyFlags.unicode },
  { type: 'key', vk: 0, scan: unit, flags: keyFlags.unicode | keyFlags.up },
]

const typed: Record<string, (scan: ScanCode) => Input[]> = {
  '\n': scan => tap(enter, scan),
  '\t': scan => tap(tab, scan),
  '\r': () => [],
}

const typeText = (text: string, scan: ScanCode) =>
  [...text].flatMap(char => typed[char]?.(scan) ?? Array.from({ length: char.length }, (_, index) => unicode(char.charCodeAt(index))).flat())

const chord = (keys: Key[], scan: ScanCode) => [...keys.map(key => virtualKey(key.vk, false, scan)), ...keys.toReversed().map(key => virtualKey(key.vk, true, scan))]

const scroll = (dx: number, dy: number) => [
  ...Array.from({ length: Math.abs(dy) }, () => mouse(mouseFlags.wheel, -Math.sign(dy) * wheelDelta)),
  ...Array.from({ length: Math.abs(dx) }, () => mouse(mouseFlags.hwheel, Math.sign(dx) * wheelDelta)),
]

const drag = (from: Point, to: Point, screen: Screen): Input[][] => {
  const path = Array.from({ length: dragSteps }, (_, index) => {
    const t = (index + 1) / dragSteps
    return moveTo({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, screen)
  })
  return [[moveTo(from, screen), mouse(mouseFlags.leftDown)], ...path.map(move => [move]), [mouse(mouseFlags.leftUp)]]
}

export const encode = (action: InputAction, screen: Screen, scan: ScanCode): Input[][] => {
  switch (action.type) {
    case 'move':
      return [[moveTo(action.at, screen)]]
    case 'click':
      return clicks(action.at, screen, 'left', 1)
    case 'double_click':
      return clicks(action.at, screen, 'left', 2)
    case 'right_click':
      return clicks(action.at, screen, 'right', 1)
    case 'drag':
      return drag(action.from, action.to, screen)
    case 'scroll':
      return [[moveTo(action.at, screen), ...scroll(action.dx, action.dy)]]
    case 'type':
      return [typeText(action.text, scan)]
    case 'key':
      return [chord(action.keys, scan)]
  }
}

export const pointsOf = (action: InputAction): Point[] => {
  if (action.type === 'drag') return [action.from, action.to]
  if ('at' in action) return [action.at]
  return []
}

export const pack = (inputs: Input[]) => {
  const bytes = new Uint8Array(inputs.length * inputSize)
  const view = new DataView(bytes.buffer)
  inputs.forEach((input, index) => {
    const at = index * inputSize
    if (input.type === 'mouse') {
      view.setUint32(at, 0, true)
      view.setInt32(at + 8, input.dx, true)
      view.setInt32(at + 12, input.dy, true)
      view.setInt32(at + 16, input.data, true)
      view.setUint32(at + 20, input.flags, true)
      return
    }
    view.setUint32(at, 1, true)
    view.setUint16(at + 8, input.vk, true)
    view.setUint16(at + 10, input.scan, true)
    view.setUint32(at + 12, input.flags, true)
  })
  return bytes
}
