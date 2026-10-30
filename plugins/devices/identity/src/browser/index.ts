import type { KeyPair } from '@sand/devices-contract'
import { deviceIdOf, generateKeyPair, isKeyPair } from '../keys'
import { readStored, writeStored } from './integrations/storage'

export const browserIdentityKey = 'sand.identity'

export interface BrowserKeys extends KeyPair {
  id: string
  persisted: boolean
}

export const loadBrowserIdentity = (): BrowserKeys => {
  const saved = readStored(browserIdentityKey)
  if (isKeyPair(saved)) return { id: deviceIdOf(saved.publicKey), publicKey: saved.publicKey, secretKey: saved.secretKey, persisted: true }
  const keys = generateKeyPair()
  return { id: deviceIdOf(keys.publicKey), ...keys, persisted: writeStored(browserIdentityKey, keys) }
}
