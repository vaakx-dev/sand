import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'

export interface DevServer {
  port: number
  url: string
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
