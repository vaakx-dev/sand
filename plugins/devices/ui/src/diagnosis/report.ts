import type { Facts } from './facts'

const time = (at: number) => new Date(at).toISOString()

export const diagnosticsText = (facts: Facts) => {
  const { diagnosis, view } = facts
  const lines = [
    `sand diagnostics for ${facts.name} (${facts.pc})`,
    `taken ${time(Date.now())} from ${location.origin}`,
    `status: ${JSON.stringify(view?.status ?? 'unknown')}`,
    `${facts.homeName} sees it as: ${facts.homeView ? JSON.stringify(facts.homeView.status) : `unknown${facts.homeError ? ` (${facts.homeError})` : ''}`}`,
    'routes:',
    ...(diagnosis?.routes ?? []).map(entry => `  ${entry.rank}. ${entry.route.kind} ${entry.route.url ?? `via ${entry.route.via}`}${entry.blocked ? ` [${entry.blocked}]` : ''}`),
    'attempts:',
    ...(diagnosis?.attempts ?? []).map(
      attempt =>
        `  ${time(attempt.at)} ${attempt.route.kind} ${attempt.route.url ?? `via ${attempt.route.via}`}: ${attempt.result}${attempt.ms === undefined ? '' : ` ${Math.round(attempt.ms)} ms`}${attempt.error ? ` (${attempt.error})` : ''}`,
    ),
  ]
  return lines.join('\n')
}
