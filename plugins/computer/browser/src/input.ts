import { heldKeys, typedKey, type Action, type ActionOf, type Key, type Point } from '@sand/computers/contract'
import { evaluate } from './evaluate'
import type { Call } from './tabs'

export interface Viewport {
  width: number
  height: number
}

type Button = 'left' | 'right'

interface MouseParams {
  button?: Button
  buttons?: number
  clickCount?: number
  deltaX?: number
  deltaY?: number
}

type Span = readonly [low: number, high: number]

const wheelPixels = 100
const glidePixels = 30
const glideSteps = 20
const glideStepMs: Span = [8, 16]
const bend = 0.08
const pressMs: Span = [50, 110]
const clickGapMs: Span = [60, 120]
const keyMs: Span = [15, 45]
const pressure = 0.5
const dragging: MouseParams = { button: 'left', buttons: 1 }
const dwellStep = 50
const loadTimeout = 15_000
const buttonBits: Record<Button, number> = { left: 1, right: 2 }
const shift = 8

export const toPixels = ({ x, y }: Point, viewport: Viewport) => ({ x: x * viewport.width, y: y * viewport.height })

const pause = ([low, high]: Span) => Bun.sleep(low + Math.random() * (high - low))

const pointers = new WeakMap<Call, Point>()

const maskOf = (keys: Key[]) => keys.reduce((mask, key) => mask | (key.modifier ?? 0), 0)

export const keyEvents = (keys: Key[]) => {
  const typesText = (maskOf(keys) & ~shift) === 0
  let held = 0
  const down = keys.map(key => {
    held |= key.modifier ?? 0
    const text = typesText ? key.text : undefined
    return { type: text ? 'keyDown' : 'rawKeyDown', key: key.key, code: key.code, windowsVirtualKeyCode: key.vk, modifiers: held, text }
  })
  const up = keys.toReversed().map(key => {
    held &= ~(key.modifier ?? 0)
    return { type: 'keyUp', key: key.key, code: key.code, windowsVirtualKeyCode: key.vk, modifiers: held }
  })
  return { down, up }
}

const pageInput = (call: Call, viewport: Viewport, modifiers: number) => {
  const mouse = (type: string, at: Point, params: MouseParams = {}) => {
    pointers.set(call, at)
    return call('Input.dispatchMouseEvent', { type, ...toPixels(at, viewport), modifiers, force: params.buttons ? pressure : 0, ...params })
  }
  const glide = async (to: Point, params: MouseParams = {}) => {
    const from = pointers.get(call) ?? to
    const { x: dx, y: dy } = toPixels({ x: to.x - from.x, y: to.y - from.y }, viewport)
    const count = Math.min(glideSteps, Math.max(1, Math.round(Math.hypot(dx, dy) / glidePixels)))
    const lean = (Math.random() * 2 - 1) * bend
    for (let step = 1; step <= count; step++) {
      const along = (1 - Math.cos((Math.PI * step) / count)) / 2
      const aside = Math.sin(Math.PI * along) * lean
      const x = from.x + (to.x - from.x) * along - ((to.y - from.y) * aside * viewport.height) / viewport.width
      const y = from.y + (to.y - from.y) * along + ((to.x - from.x) * aside * viewport.width) / viewport.height
      await mouse('mouseMoved', step === count ? to : { x, y }, params)
      if (step < count) await pause(glideStepMs)
    }
  }
  const press = async (at: Point, button: Button, clickCount: number) => {
    await mouse('mousePressed', at, { button, buttons: buttonBits[button], clickCount })
    await pause(pressMs)
    await mouse('mouseReleased', at, { button, buttons: 0, clickCount })
  }
  const send = async (events: object[]) => {
    for (const params of events) {
      await call('Input.dispatchKeyEvent', params)
      await pause(keyMs)
    }
  }
  const keys = async (keys: Key[]) => {
    const { down, up } = keyEvents(keys)
    await send(down)
    await send(up)
  }
  const nudged = (at: Point) => ({ x: at.x + 1 / viewport.width, y: at.y })
  return { mouse, glide, press, send, keys, nudged }
}

type PageInput = ReturnType<typeof pageInput>

const loaded = async (call: Call) => {
  const deadline = Date.now() + loadTimeout
  while (Date.now() < deadline) {
    const { result } = await evaluate<string>(call, { expression: 'document.readyState' })
    if (result.value === 'complete') return
    await Bun.sleep(100)
  }
}

const dwell = async (input: PageInput, at: Point, ms: number) => {
  const moves = Math.ceil(ms / dwellStep)
  for (let left = moves; left > 0; left--) {
    await Bun.sleep(dwellStep)
    await input.mouse('mouseMoved', left % 2 === 0 ? input.nudged(at) : at, dragging)
  }
}

const drag = async (input: PageInput, { from, to, ms = 0 }: ActionOf<'drag'>) => {
  await input.glide(from)
  await input.mouse('mousePressed', from, { ...dragging, clickCount: 1 })
  await pause(pressMs)
  await input.glide(to, dragging)
  await dwell(input, to, ms)
  await input.mouse('mouseReleased', to, { button: 'left', buttons: 0, clickCount: 1 })
}

const hold = async (input: PageInput, { at, ms }: ActionOf<'hold'>) => {
  await input.glide(at)
  await input.mouse('mousePressed', at, { ...dragging, clickCount: 1 })
  await Bun.sleep(ms)
  await input.mouse('mouseReleased', at, { button: 'left', buttons: 0, clickCount: 1 })
}

const keyedLength = 200

const lineKey = (char: string) => (char === '\n' ? typedKey(char) : undefined)

const type = async (input: PageInput, call: Call, text: string) => {
  const lines = text.replace(/\r\n?/g, '\n')
  const keyOf = lines.length > keyedLength ? lineKey : typedKey
  let unkeyed = ''
  for (const char of lines) {
    const key = keyOf(char)
    if (!key) {
      unkeyed += char
      continue
    }
    if (unkeyed) await call('Input.insertText', { text: unkeyed })
    unkeyed = ''
    await input.keys([key])
  }
  if (unkeyed) await call('Input.insertText', { text: unkeyed })
}

const open = async (call: Call, url: string) => {
  const { errorText } = await call<{ errorText?: string }>('Page.navigate', { url })
  if (errorText) throw new Error(`Could not open ${url}: ${errorText}`)
  await loaded(call)
}

const click = async (input: PageInput, at: Point, button: Button, clicks: number) => {
  await input.glide(at)
  for (let count = 1; count <= clicks; count++) {
    if (count > 1) await pause(clickGapMs)
    await input.press(at, button, count)
  }
}

const perform = async (input: PageInput, call: Call, action: Action) => {
  switch (action.type) {
    case 'move':
      return input.glide(action.at)
    case 'click':
      return click(input, action.at, 'left', 1)
    case 'double_click':
      return click(input, action.at, 'left', 2)
    case 'right_click':
      return click(input, action.at, 'right', 1)
    case 'hold':
      return hold(input, action)
    case 'drag':
      return drag(input, action)
    case 'scroll':
      await input.glide(action.at)
      return input.mouse('mouseWheel', action.at, { deltaX: action.dx * wheelPixels, deltaY: action.dy * wheelPixels })
    case 'type':
      return type(input, call, action.text)
    case 'key':
      return input.keys(action.keys)
    case 'wait':
      return Bun.sleep(action.ms)
    case 'open':
      return open(call, action.url)
  }
}

export const dispatch = async (call: Call, viewport: Viewport, action: Action) => {
  const held = heldKeys(action)
  const input = pageInput(call, viewport, maskOf(held))
  const { down, up } = keyEvents(held)
  await input.send(down)
  await perform(input, call, action)
  await input.send(up)
}
