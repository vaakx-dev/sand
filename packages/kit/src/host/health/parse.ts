import type { FailedPlugin, HostHealth, RuntimeHealth } from '@sand/protocol'
import { isRecord } from '../../json/record'
import { parseBuildInfo } from '../../wire/build'

const runtimes: RuntimeHealth[] = ['starting', 'ready', 'failed', 'restarting']
const logLines = 40

const parseFailed = (value: unknown): FailedPlugin[] =>
  isRecord(value) && typeof value.id === 'string' && typeof value.error === 'string' ? [{ id: value.id, error: value.error }] : []

export const parseHealth = (value: unknown): HostHealth | undefined => {
  if (!isRecord(value)) return
  const { healthy, web, failedPlugins, log, error, webError } = value
  const runtime = runtimes.find(known => known === value.runtime)
  if (typeof healthy !== 'boolean' || typeof web !== 'boolean' || !runtime) return
  if (!Array.isArray(failedPlugins) || !Array.isArray(log)) return
  const build = parseBuildInfo(value.build)
  return {
    healthy,
    runtime,
    failedPlugins: failedPlugins.flatMap(parseFailed),
    web,
    log: log.filter((line): line is string => typeof line === 'string').slice(-logLines),
    ...(typeof error === 'string' ? { error } : {}),
    ...(typeof webError === 'string' ? { webError } : {}),
    ...(build ? { build } : {}),
  }
}
