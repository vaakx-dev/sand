import { deviceParams, devicePaths, type Route, type Signer, socketRefused, type TicketRefusal } from '@sand/devices-contract'
import { ticketProof } from '@sand/devices-identity'
import { type Hello, hello } from '@sand/host-hub/contract'
import { AccessRefused, isRefusal } from '../errors/access-refused'
import { type Link, type LinkListener, openLink } from '../link/link'
import { callTimeout, probeTimeout } from '../timing'
import type { DialContext, DialRun } from './context'

export interface Greeted {
  link: Link
  hello: Hello
  ms: number
}

const pathWith = (params: Record<string, string>) => `${devicePaths.socket}?${new URLSearchParams(params)}`

export const ticketSocketPath = (ticket: string) => pathWith({ [deviceParams.ticket]: ticket })

export interface Claim {
  key: string
  nonce: string
  signature: string
}

export const signClaim = async (signer: Signer, pc: string, nonce: string): Promise<Claim> => ({
  key: signer.publicKey,
  nonce,
  signature: await signer.sign(ticketProof(nonce, pc, signer.publicKey)),
})

export const claimedSocketPath = ({ key, nonce, signature }: Claim, challenge?: string) =>
  pathWith({
    [deviceParams.key]: key,
    [deviceParams.nonce]: nonce,
    [deviceParams.signature]: signature,
    ...(challenge && { [deviceParams.challenge]: challenge }),
  })

const refusalWatch = (listener: LinkListener) => {
  let refusal: TicketRefusal | undefined
  const watched: LinkListener = {
    ...listener,
    event(link, name, payload) {
      if (name === socketRefused.id && isRefusal(payload)) refusal = payload
      else listener.event(link, name, payload)
    },
  }
  return { listener: watched, refused: () => refusal }
}

export const openSocket = async (route: Route, path: string, context: DialContext, run: DialRun): Promise<Greeted> => {
  const started = Date.now()
  const watch = refusalWatch(context.listener)
  const link = await openLink(route, context.transportOf(route), path, probeTimeout(route), watch.listener)
  const ms = Date.now() - started
  run.greeting?.(route)
  try {
    return { link, hello: await link.call(hello, context.greeting(), callTimeout), ms }
  } catch (error) {
    link.close()
    const refusal = watch.refused()
    throw refusal ? new AccessRefused(refusal) : error
  }
}
