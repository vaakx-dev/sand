import type { Platform } from '../platform'
import { linux } from './linux'
import { mac } from './mac'
import { windows } from './windows'

const platforms: Partial<Record<NodeJS.Platform, Platform>> = { win32: windows, darwin: mac, linux }

export const platform = () => {
  const found = platforms[process.platform]
  if (!found) throw new Error(`sand can't start with the OS on ${process.platform}`)
  return found
}
