import type { Action, Computer, Point, Size } from '@sand/computers/contract'
import { win32, type Win32 } from './api'
import { captureScreen } from './capture'
import { uiAutomation } from './elements'
import { foreground, refusal, windowAt, type WindowFacts } from './guard'
import { encode, inputSize, pack, pointsOf, type Input, type InputAction } from './input'
import { dpiAware, pixelOf, virtualScreen } from './screen'

const batchPause = 20
const settleRounds = 20
const cursorTolerance = 2
const vkToScanCode = 0

const blocked = 'Windows blocked the input. An app running as administrator may have focus, or the screen is locked.'

const cursorOf = (api: Win32): Point =>
  dpiAware(api, () => {
    const point = new Int32Array(2)
    api.user32.GetCursorPos(point)
    return { x: point[0] ?? 0, y: point[1] ?? 0 }
  })

const lastInputTick = (api: Win32) => {
  const info = new Uint32Array([8, 0])
  api.user32.GetLastInputInfo(info)
  return info[1]
}

const settledTick = async (api: Win32) => {
  let tick = lastInputTick(api)
  for (let round = 0; round < settleRounds; round++) {
    await Bun.sleep(batchPause)
    const next = lastInputTick(api)
    if (next === tick) return tick
    tick = next
  }
  return tick
}

const send = (api: Win32, inputs: Input[]) => {
  if (api.user32.SendInput(inputs.length, pack(inputs), inputSize) !== inputs.length) throw new Error(blocked)
}

const openUrl = async (url: string) => {
  const { protocol } = new URL(url)
  if (protocol !== 'http:' && protocol !== 'https:') throw new Error(`The desktop only opens http and https links, not ${protocol}`)
  await Bun.spawn(['rundll32.exe', 'url.dll,FileProtocolHandler', url]).exited
}

const refuseUnsafe = (window: WindowFacts | undefined) => {
  const reason = refusal(window)
  if (reason) throw new Error(reason)
}

interface AfterAgent {
  tick: number | undefined
  cursor: Point | undefined
}

export const windowsDesktop = () => {
  const api = win32()
  const uia = uiAutomation()
  const scanCode = (vk: number) => api.user32.MapVirtualKeyW(vk, vkToScanCode)
  let seen: number | undefined
  let after: AfterAgent | undefined

  const look = () => {
    seen = foreground(api)?.handle
  }

  const check = (action: InputAction) => {
    const front = foreground(api)
    refuseUnsafe(front)
    if (seen === undefined) throw new Error('Take a screenshot or list the elements before acting on the desktop.')
    if (front?.handle !== seen) throw new Error(`The window in front changed to ${front?.title || front?.process} since you last looked. Take a new screenshot before acting.`)
    const screen = virtualScreen(api)
    for (const point of pointsOf(action)) refuseUnsafe(windowAt(api, pixelOf(point, screen)))
  }

  const press = async (action: InputAction) => {
    check(action)
    const screen = virtualScreen(api)
    for (const batch of encode(action, screen, scanCode)) {
      send(api, batch)
      await Bun.sleep(batchPause)
    }
    const end = pointsOf(action).at(-1)
    after = { tick: await settledTick(api), cursor: end ? pixelOf(end, screen) : after?.cursor }
    look()
  }

  const cursorMoved = (expected: Point | undefined) => {
    if (!expected) return false
    const now = cursorOf(api)
    return Math.abs(now.x - expected.x) > cursorTolerance || Math.abs(now.y - expected.y) > cursorTolerance
  }

  return {
    info: { id: 'desktop', kind: 'desktop', label: 'This PC', os: 'windows' },
    async screenshot(fit?: Size) {
      look()
      return captureScreen(api, virtualScreen(api), fit)
    },
    elements() {
      look()
      return uia.elements(virtualScreen(api))
    },
    async act(action: Action) {
      if (action.type === 'wait') return Bun.sleep(action.ms)
      if (action.type === 'open') return openUrl(action.url)
      await press(action)
    },
    async humanInput() {
      if (!after) return false
      return lastInputTick(api) !== after.tick || cursorMoved(after.cursor)
    },
    close: uia.close,
  } satisfies Computer & { close(): void }
}
