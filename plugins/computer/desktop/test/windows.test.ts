import { parseKeys } from '@sand/computers/contract'
import { describe, expect, test } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { encodePng } from '../src/png'
import { bgraToRgb } from '../src/windows/capture'
import { parseLine, toElements } from '../src/windows/elements'
import { refusal, type WindowFacts } from '../src/windows/guard'
import { encode, inputSize, pack, pauseAfter, pointsOf } from '../src/windows/input'
import { fractionBox, normalizedOf, pixelOf, type Screen } from '../src/windows/screen'

const screen: Screen = { left: -1920, top: 0, width: 3840, height: 1080 }
const scan = (vk: number) => vk + 1000
const moveFlags = 0x1 | 0x4000 | 0x8000

const windowsPixel = (normalized: number, offset: number, size: number) => offset + Math.floor((normalized * size) / 65536)

describe('screen maths', () => {
  test('fractions map to pixels of the virtual screen, clamped to its edges', () => {
    expect(pixelOf({ x: 0, y: 0 }, screen)).toEqual({ x: -1920, y: 0 })
    expect(pixelOf({ x: 0.5, y: 0.5 }, screen)).toEqual({ x: 0, y: 540 })
    expect(pixelOf({ x: 1, y: 1 }, screen)).toEqual({ x: 1919, y: 1079 })
  })

  test('normalized coordinates land on the exact pixel the way Windows maps them back', () => {
    for (const x of [-1920, -1, 0, 1, 1234, 1919]) {
      const normalized = normalizedOf({ x, y: 0 }, screen)
      expect(windowsPixel(normalized.x, screen.left, screen.width)).toBe(x)
    }
    for (let y = 0; y < screen.height; y += 7) expect(windowsPixel(normalizedOf({ x: 0, y }, screen).y, screen.top, screen.height)).toBe(y)
  })

  test('pixel boxes become fractions, clipped to the screen, and empty boxes drop', () => {
    expect(fractionBox({ left: -1920, top: 0, right: 0, bottom: 540 }, screen)).toEqual({ left: 0, top: 0, right: 0.5, bottom: 0.5 })
    expect(fractionBox({ left: 1800, top: 1000, right: 2400, bottom: 1200 }, screen)).toEqual({ left: 3720 / 3840, top: 1000 / 1080, right: 1, bottom: 1 })
    expect(fractionBox({ left: 5000, top: 0, right: 5100, bottom: 10 }, screen)).toBeUndefined()
  })
})

describe('input encoding', () => {
  test('clicks move to the point and press the button in one batch', () => {
    const [batch, ...rest] = encode({ type: 'double_click', at: { x: 0.5, y: 0.5 } }, screen, scan)
    expect(rest).toEqual([])
    expect(batch?.map(input => input.flags)).toEqual([moveFlags, 0x2, 0x4, 0x2, 0x4])
    expect(batch?.[0]).toMatchObject({ type: 'mouse', ...{ dx: normalizedOf({ x: 0, y: 540 }, screen).x, dy: normalizedOf({ x: 0, y: 540 }, screen).y } })
    expect(encode({ type: 'right_click', at: { x: 0, y: 0 } }, screen, scan)[0]?.map(input => input.flags)).toEqual([moveFlags, 0x8, 0x10])
  })

  test('scrolls send one wheel event per notch, down and right positive', () => {
    const [batch] = encode({ type: 'scroll', at: { x: 0.5, y: 0.5 }, dx: -1, dy: 2 }, screen, scan)
    expect(batch?.slice(1).map(input => (input.type === 'mouse' ? [input.flags, input.data] : []))).toEqual([
      [0x800, -120],
      [0x800, -120],
      [0x1000, -120],
    ])
  })

  test('drags press, move in steps and release in separate batches', () => {
    const batches = encode({ type: 'drag', from: { x: 0.1, y: 0.1 }, to: { x: 0.9, y: 0.1 } }, screen, scan)
    expect(batches).toHaveLength(10)
    expect(batches[0]?.map(input => input.flags)).toEqual([moveFlags, 0x2])
    expect(batches.at(-1)?.map(input => input.flags)).toEqual([0x4])
    expect(pointsOf({ type: 'drag', from: { x: 0.1, y: 0.1 }, to: { x: 0.9, y: 0.1 } })).toEqual([
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
    ])
    expect(pointsOf({ type: 'type', text: 'a' })).toEqual([])
  })

  test('holds press at the point, wait the hold time, then release in a second batch', () => {
    const hold = { type: 'hold', at: { x: 0.25, y: 0.5 }, ms: 1500 } as const
    const batches = encode(hold, screen, scan)
    expect(batches.map(batch => batch.map(input => input.flags))).toEqual([[moveFlags, 0x2], [0x4]])
    const { x, y } = normalizedOf(pixelOf(hold.at, screen), screen)
    expect(batches[0]?.[0]).toMatchObject({ dx: x, dy: y })
    expect(batches.map((_, index) => pauseAfter(hold, index))).toEqual([1500, 20])
    expect(pauseAfter({ type: 'click', at: hold.at }, 0)).toBe(20)
    expect(pointsOf(hold)).toEqual([hold.at])
  })

  test('text types as unicode, with newlines and tabs as their keys', () => {
    const [batch] = encode({ type: 'type', text: 'a\n😀\r\t' }, screen, scan)
    expect(batch).toEqual([
      { type: 'key', vk: 0, scan: 97, flags: 0x4 },
      { type: 'key', vk: 0, scan: 97, flags: 0x6 },
      { type: 'key', vk: 0x0d, scan: 1013, flags: 0 },
      { type: 'key', vk: 0x0d, scan: 1013, flags: 0x2 },
      { type: 'key', vk: 0, scan: 0xd83d, flags: 0x4 },
      { type: 'key', vk: 0, scan: 0xd83d, flags: 0x6 },
      { type: 'key', vk: 0, scan: 0xde00, flags: 0x4 },
      { type: 'key', vk: 0, scan: 0xde00, flags: 0x6 },
      { type: 'key', vk: 0x09, scan: 1009, flags: 0 },
      { type: 'key', vk: 0x09, scan: 1009, flags: 0x2 },
    ])
  })

  test('key combos hold keys in order and release them in reverse, marking extended keys', () => {
    const [batch] = encode({ type: 'key', keys: parseKeys('ctrl+shift+left') }, screen, scan)
    expect(batch?.map(input => (input.type === 'key' ? [input.vk, input.flags] : []))).toEqual([
      [0x11, 0],
      [0x10, 0],
      [0x25, 0x1],
      [0x25, 0x3],
      [0x10, 0x2],
      [0x11, 0x2],
    ])
  })

  test('inputs pack into the 64-bit INPUT layout', () => {
    const bytes = pack([
      { type: 'mouse', dx: 100, dy: 200, data: -120, flags: 0x800 },
      { type: 'key', vk: 0x41, scan: 30, flags: 0x2 },
    ])
    const view = new DataView(bytes.buffer)
    expect(bytes.length).toBe(2 * inputSize)
    expect([view.getUint32(0, true), view.getInt32(8, true), view.getInt32(12, true), view.getInt32(16, true), view.getUint32(20, true)]).toEqual([0, 100, 200, -120, 0x800])
    expect([view.getUint32(40, true), view.getUint16(48, true), view.getUint16(50, true), view.getUint32(52, true)]).toEqual([1, 0x41, 30, 0x2])
  })
})

describe('screenshots', () => {
  test('BGRA pixels become an RGB png', async () => {
    const rgb = bgraToRgb(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]))
    expect([...rgb]).toEqual([3, 2, 1, 6, 5, 4])
    const png = await encodePng(2, 1, rgb)
    const view = new DataView(png.buffer)
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect([view.getUint32(16), view.getUint32(20), png[24], png[25]]).toEqual([2, 1, 8, 2])
    expect(view.getUint32(29)).toBe(Bun.hash.crc32(png.subarray(12, 29)))
    const idat = view.getUint32(33)
    expect([...inflateSync(png.subarray(41, 41 + idat))]).toEqual([0, 3, 2, 1, 6, 5, 4])
  })
})

describe('UI Automation elements', () => {
  test('helper lines parse into elements with ARIA roles, dropping unnamed structure', () => {
    const lines = ['Button\tSave\t-1920\t0\t-1820\t40', 'Pane\t\t0\t0\t100\t100', 'Edit\t\t0\t0\t960\t540', 'broken line']
    const raw = lines.flatMap(line => parseLine(line) ?? [])
    expect(raw).toHaveLength(3)
    expect(toElements(raw, screen)).toEqual([
      { ref: 'e0', role: 'button', name: 'Save', box: { left: 0, top: 0, right: 100 / 3840, bottom: 40 / 1080 } },
      { ref: 'e2', role: 'textbox', name: '', box: { left: 0.5, top: 0, right: 0.75, bottom: 0.5 } },
    ])
  })
})

describe('input safety', () => {
  const app: WindowFacts = { handle: 1, className: 'Notepad', title: 'notes.txt - Notepad', process: 'Notepad.exe', elevated: false }

  test('ordinary windows of the same user take input', () => {
    expect(refusal(app)).toBeUndefined()
  })

  test('security, credential and sign-in prompts never take input', () => {
    expect(refusal({ ...app, className: 'Credential Dialog Xaml Host', process: 'CredentialUIBroker.exe' })).toContain('security or sign-in prompt')
    expect(refusal({ ...app, className: 'Shell_SystemDialog', title: 'Windows Security', process: 'PickerHost.exe' })).toContain('"Windows Security"')
    expect(refusal({ ...app, className: '#32770', process: 'consent.exe' })).toContain('never clicks or types')
    expect(refusal(undefined)).toContain('secure prompt')
  })

  test('windows running as administrator, or whose elevation is unknown, never take input', () => {
    expect(refusal({ ...app, elevated: true })).toContain('runs as administrator')
    expect(refusal({ ...app, elevated: undefined })).toContain('cannot tell')
  })
})
