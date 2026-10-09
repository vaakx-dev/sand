import type { DeviceKind } from '@sand/protocol'

const browsers: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/Chrome\/|CriOS/, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const systems: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/CrOS/, 'ChromeOS'],
  [/Macintosh|Mac OS X/, 'Mac'],
  [/Linux/, 'Linux'],
]

const match = (list: [RegExp, string][], text: string) => list.find(([pattern]) => pattern.test(text))?.[1]

export const clientName = () => {
  const agent = navigator.userAgent
  const browser = match(browsers, agent) ?? 'Browser'
  const system = match(systems, agent)
  return system ? `${browser} on ${system}` : browser
}

export const clientKind = (): DeviceKind => (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'phone' : 'browser')
