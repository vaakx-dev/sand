import { fitInside, type Screenshot, type Size } from '@sand/computers/contract'
import { encodePng } from '../png'
import type { Win32 } from './api'
import { dpiAware, type Screen } from './screen'

const sourceCopy = 0x00cc0020
const halftone = 4
const headerSize = 40
const colorTableSize = 4

const bitmapInfo = ({ width, height }: Size) => {
  const info = new Uint8Array(headerSize + colorTableSize)
  const view = new DataView(info.buffer)
  view.setUint32(0, headerSize, true)
  view.setInt32(4, width, true)
  view.setInt32(8, -height, true)
  view.setUint16(12, 1, true)
  view.setUint16(14, 32, true)
  return info
}

export const bgraToRgb = (bgra: Uint8Array) => {
  const rgb = new Uint8Array((bgra.length / 4) * 3)
  for (let from = 0, to = 0; from < bgra.length; from += 4, to += 3) {
    rgb[to] = bgra[from + 2]!
    rgb[to + 1] = bgra[from + 1]!
    rgb[to + 2] = bgra[from]!
  }
  return rgb
}

const grab = ({ user32, gdi32 }: Win32, screen: Screen, size: Size) => {
  const source = user32.GetDC(null)
  const memory = gdi32.CreateCompatibleDC(source)
  const bitmap = gdi32.CreateCompatibleBitmap(source, size.width, size.height)
  const previous = gdi32.SelectObject(memory, bitmap)
  gdi32.SetStretchBltMode(memory, halftone)
  gdi32.SetBrushOrgEx(memory, 0, 0, null)
  const copied = gdi32.StretchBlt(memory, 0, 0, size.width, size.height, source, screen.left, screen.top, screen.width, screen.height, sourceCopy)
  gdi32.SelectObject(memory, previous)
  const bgra = new Uint8Array(size.width * size.height * 4)
  const rows = copied ? gdi32.GetDIBits(memory, bitmap, 0, size.height, bgra, bitmapInfo(size), 0) : 0
  gdi32.DeleteObject(bitmap)
  gdi32.DeleteDC(memory)
  user32.ReleaseDC(null, source)
  if (rows !== size.height) throw new Error('Windows did not let sand capture the screen. It may be locked or showing a secure desktop.')
  return bgra
}

export const captureScreen = async (api: Win32, screen: Screen, fit: Size | undefined): Promise<Screenshot> => {
  const size = fitInside(screen, fit)
  const bgra = dpiAware(api, () => grab(api, screen, size))
  return { png: await encodePng(size.width, size.height, bgraToRgb(bgra)), ...size }
}
