import type { Remote } from '@sand/host-remotes/contract'
import { isRecord } from '@sand/kit'

const isRemote = (value: unknown): value is Remote =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.url === 'string' &&
  Array.isArray(value.urls) &&
  value.urls.every(url => typeof url === 'string')

export const keptRemotes = (value: unknown): Remote[] => (Array.isArray(value) ? value.filter(isRemote) : [])
