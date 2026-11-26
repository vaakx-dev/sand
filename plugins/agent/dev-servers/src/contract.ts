import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
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

export const ONE_SITE = 'Give either a folder or a port'

export const sharedSiteEntry = 'dev-server-link'

export const sharedSiteSchema = lazy(() => z.object({ port: z.number().int().positive(), title: z.string().min(1) }))

export type SharedSite = z.infer<ReturnType<typeof sharedSiteSchema>>

export const shareInput = lazy(() =>
  z
    .object({
      folder: z.string().min(1).optional().describe("A folder of static files to serve, absolute or relative to the thread's folder. Its index.html is the home page"),
      port: z.number().int().positive().optional().describe('The port of a web server this thread already started'),
      title: z.string().min(1).optional().describe('The name shown on the card'),
    })
    .refine(({ folder, port }) => (folder === undefined) !== (port === undefined), ONE_SITE),
)

export type Share = z.infer<ReturnType<typeof shareInput>>

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

export const devServerShare = request('devServers.share', {
  input: shareInput,
  output: type<DevServer>(),
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
