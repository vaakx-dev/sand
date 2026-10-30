import { request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export interface TailscaleState {
  installed: boolean
  running: boolean
  name?: string
  ip?: string
  https: boolean
  serving: boolean
  httpsUrl?: string
  error?: string
}

export interface TailscalePeer {
  name: string
  ip: string
  online: boolean
}

export interface Tailscale {
  state(): TailscaleState
  refresh(): Promise<TailscaleState>
  setHttps(on: boolean): Promise<TailscaleState>
  peers(): Promise<TailscalePeer[]>
}

export const tailscale = service<Tailscale>('tailscale')

export const tailscaleState = event<(state: TailscaleState) => void>('tailscale.state')

export const tailscaleGet = request('tailscale.get', { input: z.object({}), output: type<TailscaleState>() })
export const tailscaleSet = request('tailscale.set', { input: z.object({ https: z.boolean() }), output: type<TailscaleState>() })
export const tailscaleChange = wireEvent<TailscaleState>('tailscale.change')
