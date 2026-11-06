import type { Action, ActionOf, Key, Point } from '@sand/computers/contract'
import type { Call } from './tabs'

export interface Viewport {
  width: number
  height: number
}

type Button = 'left' | 'right'

const wheelPixels = 100
const dragSteps = 8
const loadTimeout = 15_000
const buttonBits: Record<Button, number> = { left: 1, right: 2 }
const shift = 8

export const toPixels = ({ x, y }: Point, viewport: Viewport) => ({ x: x * viewport.width, y: y * viewport.height })

export const keyEvents = (keys: Key[]) => {
  const modifiers = keys.reduce((mask, key) => mask | (key.modifier ?? 0), 0)
  const typesText = (modifiers & ~shift) === 0
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
  return [...down, ...up]
}

const enter: Key = { name: 'enter', key: 'Enter', code: 'Enter', vk: 0x0d, text: '\r' }

const pageInput = (call: Call, viewport: Viewport) => {
  const mouse = (type: string, at: Point, extra: object = {}) => call('Input.dispatchMouseEvent', { type, ...toPixels(at, viewport), ...extra })
  const press = async (at: Point, button: Button, clickCount: number) => {
    await mouse('mousePressed', at, { button, buttons: buttonBits[button], clickCount })
    await mouse('mouseReleased', at, { button, buttons: 0, clickCount })
  }
  const keys = async (keys: Key[]) => {
    for (const params of keyEvents(keys)) await call('Input.dispatchKeyEvent', params)
  }
  return { mouse, press, keys }
}

type PageInput = ReturnType<typeof pageInput>

const loaded = async (call: Call) => {
  const deadline = Date.now() + loadTimeout
  while (Date.now() < deadline) {
    const { result } = await call<{ result: { value: string } }>('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true })
    if (result.value === 'complete') return
    await Bun.sleep(100)
  }
}

const steps = (from: Point, to: Point) =>
  Array.from({ length: dragSteps }, (_, index) => {
    const t = (index + 1) / dragSteps
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
  })

const drag = async (input: PageInput, { from, to }: ActionOf<'drag'>) => {
  await input.mouse('mouseMoved', from)
  await input.mouse('mousePressed', from, { button: 'left', buttons: 1, clickCount: 1 })
  for (const at of steps(from, to)) await input.mouse('mouseMoved', at, { button: 'left', buttons: 1 })
  await input.mouse('mouseReleased', to, { button: 'left', buttons: 0, clickCount: 1 })
}

const type = async (input: PageInput, call: Call, text: string) => {
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (index > 0) await input.keys([enter])
    if (line) await call('Input.insertText', { text: line })
  }
}

const open = async (call: Call, url: string) => {
  const { errorText } = await call<{ errorText?: string }>('Page.navigate', { url })
  if (errorText) throw new Error(`Could not open ${url}: ${errorText}`)
  await loaded(call)
}

const click = async (input: PageInput, at: Point, button: Button, clicks: number) => {
  await input.mouse('mouseMoved', at)
  for (let count = 1; count <= clicks; count++) await input.press(at, button, count)
}

export const dispatch = async (call: Call, viewport: Viewport, action: Action) => {
  const input = pageInput(call, viewport)
  switch (action.type) {
    case 'move':
      return input.mouse('mouseMoved', action.at)
    case 'click':
      return click(input, action.at, 'left', 1)
    case 'double_click':
      return click(input, action.at, 'left', 2)
    case 'right_click':
      return click(input, action.at, 'right', 1)
    case 'drag':
      return drag(input, action)
    case 'scroll':
      await input.mouse('mouseMoved', action.at)
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
