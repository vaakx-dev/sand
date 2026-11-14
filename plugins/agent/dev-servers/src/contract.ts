import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export interface DevServer {
  port: number
  url: string
  address: string
  pid: number
  name: string
  command: string
  session: string
}

export const helloDevServers = helloField<DevServer[]>('devServers')

export const devServersChange = wireEvent<DevServer[]>('devServers.change')

export const devServerList = request('devServers.list', {
  input: () => z.object({ session: z.string().optional() }),
  output: type<DevServer[]>(),
  callers: 'any',
  place: 'thread',
})

export const devServerStop = request('devServers.stop', {
  input: () => z.object({ port: z.number().int().positive(), session: z.string().optional() }),
  output: type<boolean>(),
  callers: 'any',
  place: 'thread',
})

export const devServerOpen = request('devServers.open', {
  input: () => z.object({ port: z.number().int().positive(), session: z.string().optional() }),
  output: type<string[]>(),
  callers: 'any',
  place: 'thread',
})

export const devServerProxy = request('devServers.proxy', {
  input: () => z.object({ port: z.number().int().positive(), address: z.string().min(1), device: z.string().min(1) }),
  output: type<string[]>(),
  callers: 'runtime',
})

export const devServerProxiesKeep = request('devServers.proxies.keep', {
  input: () => z.object({ ports: z.array(z.number().int().positive()) }),
  output: type<void>(),
  callers: 'runtime',
})

export const devServerRelay = request('devServers.relay', {
  input: () => z.object({ pc: z.string().min(1), links: z.array(z.string().url()).min(1) }),
  output: type<string[]>(),
})
