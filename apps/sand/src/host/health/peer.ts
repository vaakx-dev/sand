import type { BuildInfo, FailedPlugin, HostHealth, RuntimeHealth } from '@sand/protocol'
import { remoteStore } from '../remotes/store'
import { callPeer, PeerError } from '../plugin-sync/link/call'

const runtimes: readonly RuntimeHealth[] = ['starting', 'ready', 'failed', 'restarting']
const logLines = 40
const timeout = 20_000

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'

const parseFailed = (value: unknown): FailedPlugin[] =>
  isObject(value) && typeof value.id === 'string' && typeof value.error === 'string' ? [{ id: value.id, error: value.error }] : []

const parseBuild = (value: unknown): BuildInfo | undefined =>
  isObject(value) && typeof value.id === 'string' && typeof value.time === 'number' ? { id: value.id, time: value.time } : undefined

export const parseHealth = (value: unknown): HostHealth | undefined => {
  if (!isObject(value)) return
  const { healthy, runtime, web, failedPlugins, log, error, webError, build } = value
  if (typeof healthy !== 'boolean' || typeof web !== 'boolean') return
  if (!runtimes.includes(runtime as RuntimeHealth)) return
  if (!Array.isArray(failedPlugins) || !Array.isArray(log)) return
  const info = parseBuild(build)
  return {
    healthy,
    runtime: runtime as RuntimeHealth,
    failedPlugins: failedPlugins.flatMap(parseFailed),
    web,
    log: log.filter((line): line is string => typeof line === 'string').slice(-logLines),
    ...(typeof error === 'string' ? { error } : {}),
    ...(typeof webError === 'string' ? { webError } : {}),
    ...(info ? { build: info } : {}),
  }
}

export const createPeerHealth = (home: string) => {
  const sockets = new Set<WebSocket>()
  return {
    async health(device: string): Promise<HostHealth> {
      const record = (await remoteStore(home)).get(device)
      if (!record) throw new Error('that PC is not paired with this one')
      let answer: unknown
      try {
        answer = await callPeer(record, { type: 'host.health' }, sockets, timeout)
      } catch (error) {
        if (error instanceof PeerError && error.state === 'failed') throw new Error(`${record.name} could not report its health: ${error.message}`)
        throw error
      }
      const health = parseHealth(answer)
      if (!health) throw new Error(`${record.name} sent a health report this sand can't read`)
      return health
    },
    stop() {
      for (const socket of sockets) socket.close()
      sockets.clear()
    },
  }
}
