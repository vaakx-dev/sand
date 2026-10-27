import type { HostHealth } from '@sand/host-health/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { div, p } from '@vaakx-dev/vrui'

const healthSummary = (health: HostHealth) => {
  if (health.healthy) return 'sand runs normally'
  const parts: string[] = []
  if (health.runtime !== 'ready') parts.push(`the runtime is ${health.runtime}`)
  const failed = health.failedPlugins.length
  if (failed) parts.push(`${plural(failed, 'plugin')} failed to load`)
  if (!health.web) parts.push("the web page isn't served")
  return parts.join(' · ')
}

const problemText = (health: HostHealth) =>
  [health.error, health.webError && `Web page: ${health.webError}`, ...health.failedPlugins.map(plugin => `${plugin.id}: ${plugin.error}`)]
    .filter(Boolean)
    .join('\n\n')

const logTail = ({ codeBlock, metaLine }: Kit, log: string) => [metaLine('Last lines of server.log'), codeBlock({ copy: () => log, class: 'max-h-64' }, log)]

export const healthDetails = (kit: Kit, health: HostHealth) => {
  const { codeBlock } = kit
  const problems = problemText(health)
  const log = health.log.join('\n')
  return div(
    { class: 'flex flex-col gap-2' },
    p({ class: ['text-sm', health.healthy ? 'text-neutral-100' : 'text-danger-400'] }, healthSummary(health)),
    problems ? codeBlock({ copy: () => problems, danger: true }, problems) : null,
    ...(log ? logTail(kit, log) : []),
  )
}
