import type { Resume, SavedResume } from '@sand/devices-contract'
import { isRecord } from '@sand/util'

export const isResume = (value: unknown): value is Resume => isRecord(value) && typeof value.nonce === 'string' && typeof value.expires === 'number'

export const isSavedResume = (value: unknown): value is SavedResume =>
  isResume(value) && 'route' in value && typeof value.route === 'string' && 'signature' in value && typeof value.signature === 'string'
