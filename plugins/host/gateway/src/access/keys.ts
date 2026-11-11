import type { Resume } from '@sand/devices-contract'
import { hashSecret, randomSecret } from '@sand/util/fs'
import type { RouteCaller } from '../contract'
import { createExpiring } from './expiring'

const nonceLife = 60_000
const ticketLife = 30_000
const resumeLife = 7 * 24 * 60 * 60_000
const resumesPerDevice = 4

interface Held {
  hash: string
  expires: number
}

export const createNonces = () => createExpiring<true>(nonceLife)

export const createTickets = () => createExpiring<RouteCaller>(ticketLife)

export const createResumes = () => {
  const byDevice = new Map<string, Held[]>()
  const bySocket = new WeakMap<object, Resume>()

  const live = (device: string) => {
    const now = Date.now()
    return (byDevice.get(device) ?? []).filter(held => held.expires > now)
  }

  const keep = (device: string, held: Held[]) => {
    if (held.length) byDevice.set(device, held)
    else byDevice.delete(device)
  }

  const issue = (device: string): Resume => {
    const nonce = randomSecret()
    const expires = Date.now() + resumeLife
    keep(device, [...live(device).slice(1 - resumesPerDevice), { hash: hashSecret(nonce), expires }])
    return { nonce, expires }
  }

  return {
    forSocket(socket: object, device: string) {
      const resume = bySocket.get(socket) ?? issue(device)
      bySocket.set(socket, resume)
      return resume
    },
    take(device: string, nonce: string) {
      const hash = hashSecret(nonce)
      const held = live(device)
      keep(device, held.filter(entry => entry.hash !== hash))
      return held.some(entry => entry.hash === hash)
    },
    drop: (device: string) => void byDevice.delete(device),
  }
}

export type Nonces = ReturnType<typeof createNonces>
export type Tickets = ReturnType<typeof createTickets>
export type Resumes = ReturnType<typeof createResumes>
