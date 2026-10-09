import { copyButton, div, el, p, span, type Child } from '@sand/dom'
import type { HostHealth } from '@sand/protocol'

export const healthSummary = (health: HostHealth): string => {
  if (health.healthy) return 'sand runs normally'
  const parts: string[] = []
  if (health.runtime !== 'ready') parts.push(`the runtime is ${health.runtime}`)
  const failed = health.failedPlugins.length
  if (failed) parts.push(failed === 1 ? '1 plugin failed to load' : `${failed} plugins failed to load`)
  if (!health.web) parts.push('the web page is not served')
  return parts.join(' · ')
}

const failedPlugin = (id: string, error: string) =>
  div(
    { class: 'flex flex-col gap-1' },
    span({ class: 'font-medium text-neutral-100' }, id),
    el('pre', { class: 'whitespace-pre-wrap wrap-anywhere text-neutral-400' }, error),
  )

const logTail = (health: HostHealth) => [
  div(
    { class: 'flex items-center justify-between gap-2' },
    span({ class: 'text-neutral-500' }, 'Last lines of server.log'),
    copyButton({ text: () => health.log.join('\n'), label: 'Copy log' }),
  ),
  el(
    'pre',
    { class: 'max-h-64 overflow-auto rounded-lg bg-neutral-950 p-3 font-mono text-[11px] leading-snug whitespace-pre-wrap wrap-anywhere text-neutral-300' },
    health.log.join('\n'),
  ),
]

export const healthDetails = (health: HostHealth): Child =>
  div(
    { class: 'flex flex-col gap-3 text-xs' },
    p({ class: `text-sm ${health.healthy ? 'text-neutral-300' : 'text-danger-400'}` }, healthSummary(health)),
    health.error ? div({ class: 'whitespace-pre-wrap wrap-anywhere text-neutral-400' }, health.error) : null,
    health.webError ? div({ class: 'text-neutral-400' }, `Web page: ${health.webError}`) : null,
    ...health.failedPlugins.map(plugin => failedPlugin(plugin.id, plugin.error)),
    ...(health.log.length ? logTail(health) : []),
  )
