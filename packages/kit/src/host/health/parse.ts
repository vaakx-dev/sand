import type { BuildInfo, FailedPlugin, HostHealth, RuntimeHealth } from '@sand/protocol'
import { isRecord } from '../../json/record'

const runtimes: readonly RuntimeHealth[] = ['starting', 'ready', 'failed', 'restarting']
const logLines = 40

const parseFailed = (value: unknown): FailedPlugin[] =>
  isRecord(value) && typeof value.id === 'string' && typeof value.error === 'string' ? [{ id: value.id, error: value.error }] : []

const parseBuild = (value: unknown): BuildInfo | undefined =>
  isRecord(value) && typeof value.id === 'string' && typeof value.time === 'number' ? { id: value.id, time: value.time } : undefined

export const parseHealth = (value: unknown): HostHealth | undefined => {
  if (!isRecord(value)) return
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
