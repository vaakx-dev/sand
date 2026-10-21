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

export interface HostTailscale {
  state(): TailscaleState
  refresh(): Promise<TailscaleState>
  setHttps(on: boolean): Promise<TailscaleState>
}

export const tailscale = service<HostTailscale>('tailscale')

export const hostTailscale = event<(state: TailscaleState) => void>('host.tailscale')

export const tailscaleGet = request('tailscale.get', { input: z.object({}), output: type<TailscaleState>() })
export const tailscaleSet = request('tailscale.set', { input: z.object({ https: z.boolean() }), output: type<TailscaleState>() })

export const tailscaleChange = wireEvent<TailscaleState>('tailscale.change')
