import { dirname, join } from 'node:path'
import type { Captured } from './send/posthog'

export type Capture = (event: string, properties?: Record<string, unknown>) => void

const sandVersion = async () => {
  try {
    const { version } = (await Bun.file(join(dirname(Bun.main), '..', 'package.json')).json()) as { version?: unknown }
    return typeof version === 'string' ? version : undefined
  } catch {
    return undefined
  }
}

export const commonProperties = async () => ({
  $lib: 'sand',
  $process_person_profile: false,
  $geoip_disable: true,
  os: process.platform,
  arch: process.arch,
  version: await sandVersion(),
})

export const createCapture =
  (add: (event: Captured) => void, common: Record<string, unknown>): Capture =>
  (event, properties = {}) =>
    add({ uuid: Bun.randomUUIDv7(), event, properties: { ...common, ...properties }, timestamp: new Date().toISOString() })
