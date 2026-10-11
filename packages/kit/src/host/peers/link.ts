import type { DeviceInfo } from '@sand/protocol'
import { isRecord } from '../../json/record'

const word = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const deviceInfo = (value: unknown): DeviceInfo | undefined => {
  if (!isRecord(value) || !word(value.id) || !word(value.name)) return
  return { id: value.id, name: value.name, platform: typeof value.platform === 'string' ? value.platform : '' }
}

export const parsePeerLink = (value: unknown): { device: DeviceInfo; urls: string[]; key?: string } | undefined => {
  if (!isRecord(value) || !Array.isArray(value.urls)) return
  const device = deviceInfo(value.device)
  if (!device) return
  return { device, urls: value.urls.filter(word).slice(0, 16), ...(word(value.key) && { key: value.key }) }
}
