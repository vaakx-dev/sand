import type { DeviceKind } from '@sand/devices-contract'

interface Described {
  name: string
  kind: DeviceKind
  platform: string
}

const browsers: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/Chrome\/|CriOS/, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const systems: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/Linux/, 'Linux'],
]

const match = (table: [RegExp, string][], agent: string) => table.find(([pattern]) => pattern.test(agent))?.[1]

const mobile = /Android|iPhone|iPad|iPod|Mobile/

export const describeThisDevice = (): Described => {
  const agent = navigator.userAgent
  const browser = match(browsers, agent) ?? 'Browser'
  const system = match(systems, agent)
  return {
    name: system ? `${browser} on ${system}` : browser,
    kind: mobile.test(agent) ? 'phone' : 'browser',
    platform: system ?? navigator.platform,
  }
}
