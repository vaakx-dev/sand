import type { Signer } from '@sand/devices-contract'
import { deviceIdOf, generateKeyPair, sign } from '@sand/devices-identity'
import { browserIdentityKey, loadBrowserIdentity } from '@sand/devices-identity/browser'
import { writeStored } from './integrations/storage'

export const browserKeys = () => {
  let keys = loadBrowserIdentity()

  const signer: Signer = {
    get publicKey() {
      return keys.publicKey
    },
    sign: payload => sign(payload, keys.secretKey),
  }

  return {
    signer,
    publicKey: () => keys.publicKey,
    renew() {
      const next = generateKeyPair()
      keys = { id: deviceIdOf(next.publicKey), ...next, persisted: writeStored(browserIdentityKey, next) }
    },
  }
}

export type BrowserKeys = ReturnType<typeof browserKeys>
