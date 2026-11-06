import type { Box, Point } from '@sand/computers/contract'
import type { Win32 } from './api'

export interface Screen {
  left: number
  top: number
  width: number
  height: number
}

const perMonitorAwareV2 = -4
const metrics = { left: 76, top: 77, width: 78, height: 79 }
const normalizedRange = 65536

export const dpiAware = <T>({ user32 }: Win32, run: () => T): T => {
  const previous = user32.SetThreadDpiAwarenessContext(perMonitorAwareV2)
  try {
    return run()
  } finally {
    user32.SetThreadDpiAwarenessContext(previous)
  }
}

export const virtualScreen = (api: Win32): Screen =>
  dpiAware(api, () => ({
    left: api.user32.GetSystemMetrics(metrics.left),
    top: api.user32.GetSystemMetrics(metrics.top),
    width: api.user32.GetSystemMetrics(metrics.width),
    height: api.user32.GetSystemMetrics(metrics.height),
  }))

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

export const pixelOf = ({ x, y }: Point, screen: Screen): Point => ({
  x: screen.left + clamp(Math.floor(x * screen.width), screen.width - 1),
  y: screen.top + clamp(Math.floor(y * screen.height), screen.height - 1),
})

const normalize = (offset: number, size: number) => Math.min(normalizedRange - 1, Math.round(((offset + 0.5) * normalizedRange) / size))

export const normalizedOf = (pixel: Point, screen: Screen): Point => ({
  x: normalize(pixel.x - screen.left, screen.width),
  y: normalize(pixel.y - screen.top, screen.height),
})

export const fractionBox = (rect: Box, screen: Screen): Box | undefined => {
  const left = clamp(rect.left - screen.left, screen.width)
  const top = clamp(rect.top - screen.top, screen.height)
  const right = clamp(rect.right - screen.left, screen.width)
  const bottom = clamp(rect.bottom - screen.top, screen.height)
  if (right <= left || bottom <= top) return undefined
  return { left: left / screen.width, top: top / screen.height, right: right / screen.width, bottom: bottom / screen.height }
}
