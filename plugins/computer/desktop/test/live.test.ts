import { findBrowser, launch } from '@sand/cdp'
import { parseKeys, type Point } from '@sand/computers/contract'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { dlopen, FFIType } from 'bun:ffi'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { win32, type Win32 } from '../src/windows/api'
import { windowsDesktop } from '../src/windows/desktop'
import { dpiAware, virtualScreen } from '../src/windows/screen'

const live = process.platform === 'win32' && process.env.SAND_DESKTOP_TESTS === '1'

const title = 'Sand desktop test'

const page = `<!doctype html><title>${title}</title><body style="margin:0;height:3000px;font:20px sans-serif">
<button id="add" style="position:fixed;left:40px;top:40px;width:240px;height:80px">Add one</button>
<input id="name" aria-label="Name" style="position:fixed;left:40px;top:160px;width:300px;height:50px">
<script>let count = 0; add.onclick = () => (add.dataset.count = ++count)</script>`

const windowApi = () =>
  dlopen('user32.dll', {
    SetCursorPos: { args: [FFIType.i32, FFIType.i32], returns: FFIType.bool },
    WindowFromPoint: { args: [FFIType.i64], returns: FFIType.ptr },
    GetAncestor: { args: [FFIType.ptr, FFIType.u32], returns: FFIType.ptr },
    GetForegroundWindow: { args: [], returns: FFIType.ptr },
    GetWindowTextW: { args: [FFIType.ptr, FFIType.ptr, FFIType.i32], returns: FFIType.i32 },
  }).symbols

const cursorAt = (api: Win32) =>
  dpiAware(api, () => {
    const point = new Int32Array(2)
    api.user32.GetCursorPos(point)
    return { x: point[0] ?? 0, y: point[1] ?? 0 }
  })

const openTestWindow = async (profile: string, url: string) => {
  const executable = await findBrowser()
  if (!executable) throw new Error('These tests need Chrome or Edge')
  const args = ['--no-first-run', '--no-default-browser-check', '--window-position=120,120', '--window-size=700,500', `--app=${url}`]
  const browser = await launch({ executable, profile, args, deadline: Date.now() + 20_000 })
  const { targetInfos } = await browser.call<{ targetInfos: { targetId: string; type: string }[] }>('Target.getTargets')
  const target = targetInfos.find(info => info.type === 'page')
  if (!target) throw new Error('The test window has no page')
  const { sessionId } = await browser.call<{ sessionId: string }>('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  const evaluate = async <T>(expression: string) => {
    const { result } = await browser.call<{ result: { value: T } }>('Runtime.evaluate', { expression, returnByValue: true }, sessionId)
    return result.value
  }
  return { browser, evaluate }
}

const openRig = async () => {
  const api = win32()
  const windows = windowApi()
  const profile = mkdtempSync(join(tmpdir(), 'sand-desktop-test-'))
  const server = Bun.serve({ port: 0, fetch: () => new Response(page, { headers: { 'content-type': 'text/html' } }) })
  const home = cursorAt(api)
  const { browser, evaluate } = await openTestWindow(profile, server.url.href)
  const desktop = windowsDesktop()
  const close = async () => {
    dpiAware(api, () => windows.SetCursorPos(home.x, home.y))
    desktop.close()
    await browser.close()
    await server.stop(true)
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
  return { api, windows, home, desktop, evaluate, close }
}

describe.skipIf(!live)('the real Windows desktop', () => {
  let rig: Awaited<ReturnType<typeof openRig>>

  const titleOf = (window: ReturnType<typeof rig.windows.GetForegroundWindow>) => {
    const text = new Uint16Array(256)
    return String.fromCharCode(...text.subarray(0, rig.windows.GetWindowTextW(window, text, text.length)))
  }

  const rootAt = ({ x, y }: Point) => {
    const screen = virtualScreen(rig.api)
    const column = BigInt(Math.floor(screen.left + x * screen.width)) & 0xffffffffn
    const row = BigInt(Math.floor(screen.top + y * screen.height)) & 0xffffffffn
    return dpiAware(rig.api, () => rig.windows.GetAncestor(rig.windows.WindowFromPoint(BigInt.asIntN(64, column | (row << 32n))), 2))
  }

  const expectOnTop = (at: Point) => expect(titleOf(rootAt(at))).toBe(title)

  const expectFocused = () => expect(titleOf(rig.windows.GetForegroundWindow())).toBe(title)

  const until = async (expression: string) => {
    for (let tries = 0; tries < 40; tries++) {
      if (await rig.evaluate<boolean>(expression)) return
      await Bun.sleep(50)
    }
    throw new Error(`The page never got to ${expression}`)
  }

  const centerOf = async (id: string): Promise<Point> => {
    const [x, y] = await rig.evaluate<[number, number]>(`(() => {
      const box = document.getElementById('${id}').getBoundingClientRect()
      const border = (outerWidth - innerWidth) / 2
      const left = screenX + border + box.left + box.width / 2
      const top = screenY + outerHeight - innerHeight - border + box.top + box.height / 2
      return [Math.round(left * devicePixelRatio), Math.round(top * devicePixelRatio)]
    })()`)
    const screen = virtualScreen(rig.api)
    return { x: (x - screen.left + 0.5) / screen.width, y: (y - screen.top + 0.5) / screen.height }
  }

  beforeAll(async () => {
    rig = await openRig()
    await until(`document.readyState === 'complete'`)
    await Bun.sleep(500)
    await rig.desktop.screenshot({ width: 100, height: 100 })
  })

  afterAll(() => rig?.close())

  test('captures the whole virtual screen, scaled to fit', async () => {
    const screen = virtualScreen(rig.api)
    const shot = await rig.desktop.screenshot({ width: 1000, height: 1000 })
    expect(shot.width).toBeLessThanOrEqual(1000)
    expect(shot.height).toBeLessThanOrEqual(1000)
    expect(Math.abs(shot.width / shot.height - screen.width / screen.height)).toBeLessThan(0.01)
  })

  test('moves the cursor to the exact pixel, and notices when a person moves it', async () => {
    await rig.desktop.act({ type: 'move', at: { x: 0.5, y: 0.5 } })
    const screen = virtualScreen(rig.api)
    expect(cursorAt(rig.api)).toEqual({ x: screen.left + Math.floor(screen.width / 2), y: screen.top + Math.floor(screen.height / 2) })
    expect(await rig.desktop.humanInput()).toBe(false)
    dpiAware(rig.api, () => rig.windows.SetCursorPos(rig.home.x, rig.home.y + 40))
    expect(await rig.desktop.humanInput()).toBe(true)
  })

  test('clicks a button in a real window', async () => {
    const at = await centerOf('add')
    expectOnTop(at)
    await rig.desktop.act({ type: 'click', at })
    await rig.desktop.act({ type: 'click', at })
    await until(`add.dataset.count === '2'`)
  })

  test('types and presses keys into the focused field', async () => {
    const at = await centerOf('name')
    expectOnTop(at)
    await rig.desktop.act({ type: 'click', at })
    await Bun.sleep(100)
    expectFocused()
    await rig.desktop.act({ type: 'type', text: 'héllo 😀' })
    await until(`document.getElementById('name').value === 'héllo 😀'`)
    await rig.desktop.act({ type: 'key', keys: parseKeys('ctrl+a') })
    await rig.desktop.act({ type: 'type', text: 'sand' })
    await until(`document.getElementById('name').value === 'sand'`)
  })

  test('scrolls with the wheel', async () => {
    const at = await centerOf('add')
    expectOnTop(at)
    await rig.desktop.act({ type: 'scroll', at, dx: 0, dy: 3 })
    await until('scrollY > 0')
  })

  test('lists UI elements of the window in front', async () => {
    expectFocused()
    const elements = await rig.desktop.elements()
    expect(elements.some(element => element.role === 'button' && element.name === 'Add one')).toBe(true)
  })
})
