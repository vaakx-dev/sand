import type { HostHealth } from '@sand/host-health/contract'
import type { BuildInfo, FailedPlugin, RuntimeHealth } from '@sand/protocol'

const runtimes: readonly RuntimeHealth[] = ['starting', 'ready', 'failed', 'restarting']
const logLines = 40

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
