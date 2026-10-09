import type { WirePairing } from '@sand/protocol'
import { bearer, redeemPairing, requestTicket, ticketSocketUrl } from '@sand/kit'
import { learn } from '../connection/book'
import { clientKind, clientName } from './client'
import { hostKeys } from './keys'
import { Unpaired } from './unpaired'

export interface PairOffer {
  secret: string
  url?: string
}

export interface HostAuthOptions {
  base(): string | undefined
  offer?(): Promise<PairOffer | undefined> | PairOffer | undefined
  paired?(): void
}

export interface HostAuth {
  socketUrl(base: string, host: string): Promise<string>
  pairing(): WirePairing | undefined
  fetch(path: string, init?: RequestInit): Promise<Response>
}

export const createHostAuth = (options: HostAuthOptions): HostAuth => {
  let host: string | undefined

  const ticketWith = async (base: string, key: string) => {
    const ticket = await requestTicket(base, key)
    return ticket && ticketSocketUrl(base, ticket.ticket)
  }

  const storedTicket = async (base: string, id: string) => {
    const stored = hostKeys.get(id)
    if (!stored) return
    const url = await ticketWith(base, stored.key)
    if (url) options.paired?.()
    else hostKeys.forget(id, stored.key)
    return url
  }

  const pairedTicket = async (base: string, id: string) => {
    const offer = await options.offer?.()
    if (!offer) throw new Unpaired()
    const request = { secret: offer.secret, name: clientName(), kind: clientKind() }
    const result = await redeemPairing(base, request).catch(error => {
      if (!offer.url || offer.url === base) throw error
      return redeemPairing(offer.url, request)
    })
    if (result.host.id !== id) throw new Error('The pairing link is for a different PC')
    hostKeys.set(id, { device: result.deviceId, key: result.key })
    learn(id, result.urls ?? [])
    const url = await ticketWith(base, result.key)
    if (!url) throw new Error('sand refused the new key')
    return url
  }

  return {
    async socketUrl(base, id) {
      host = id
      return (await storedTicket(base, id)) ?? (await pairedTicket(base, id))
    },
    pairing() {
      const stored = host ? hostKeys.get(host) : undefined
      return host && stored ? { host, device: stored.device } : undefined
    },
    fetch(path, init = {}) {
      const stored = host ? hostKeys.get(host) : undefined
      if (!stored) return Promise.reject(new Unpaired())
      const base = options.base()
      if (!base) return Promise.reject(new Error('Not connected to the sand server'))
      const headers = new Headers(init.headers)
      for (const [name, value] of Object.entries(bearer(stored.key))) headers.set(name, value)
      return fetch(new URL(path, base), { ...init, headers })
    },
  }
}
