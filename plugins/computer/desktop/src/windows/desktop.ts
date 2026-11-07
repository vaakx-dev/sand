import type { Action, Computer, Size } from '@sand/computers/contract'
import { win32, type Win32 } from './api'
import { captureScreen } from './capture'
import { uiAutomation } from './elements'
import { foreground, refusal, windowAt, type WindowFacts } from './guard'
import { encode, inputSize, pack, pauseAfter, pointsOf, type Input, type InputAction } from './input'
import { pixelOf, virtualScreen } from './screen'

const settlePause = 400
const vkToScanCode = 0

const blocked = 'Windows blocked the input. An app running as administrator may have focus, or the screen is locked.'

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

export const windowsDesktop = () => {
  const api = win32()
  const uia = uiAutomation()
  const scanCode = (vk: number) => api.user32.MapVirtualKeyW(vk, vkToScanCode)
  let seen: number | undefined

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
    for (const [index, batch] of encode(action, screen, scanCode).entries()) {
      send(api, batch)
      await Bun.sleep(pauseAfter(action, index))
    }
    look()
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
    settle: () => Bun.sleep(settlePause),
    close: uia.close,
  } satisfies Computer & { close(): void }
}
