import type { WirePairing } from '../contract'
import { hostKeys } from '../auth/keys'
import { homeHost } from '../connection/book'

export interface Scope {
  host: string
  key: string
}

export const scopeOf = ({ host, device }: WirePairing): Scope => ({ host, key: `${host}/${device}` })

export const savedScope = (): Scope | undefined => {
  const host = homeHost()
  const device = host ? hostKeys.get(host)?.device : undefined
  return host && device ? scopeOf({ host, device }) : undefined
}
