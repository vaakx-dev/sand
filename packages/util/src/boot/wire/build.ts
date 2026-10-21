import type { BuildInfo } from '@sand/host-dist/contract'
import { isRecord } from '../../json/record'

export const parseBuildInfo = (value: unknown): BuildInfo | undefined => {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) return
  if (typeof value.time !== 'number' || !Number.isFinite(value.time)) return
  return { id: value.id, time: value.time }
}
