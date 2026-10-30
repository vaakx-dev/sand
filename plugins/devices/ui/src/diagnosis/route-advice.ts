import type { Attempt, RouteEntry } from '@sand/devices-contract'
import type { Ui } from '../ui'
import { type Facts, latestAttempts } from './facts'

const failed = new Set<Attempt['result']>(['timeout', 'refused', 'error', 'not-allowed'])

const viaAdvice = (ui: Ui, facts: Facts, through: string) => {
  const middle = ui.data.nameOf(through)
  if (!ui.ctx.pcs.online(through)) return `Check that ${middle} is on. sand reaches ${facts.name} through it.`
  return `Check that ${facts.name} is on and that ${middle} can reach it.`
}

const adviceFor = (ui: Ui, facts: Facts, entry: RouteEntry, attempt: Attempt) => {
  const { kind, via } = entry.route
  if (attempt.result === 'not-allowed') return `${facts.name} refused ${facts.device.toLowerCase()} on that address. Ask to join again from a paired device.`
  if (kind === 'via') return viaAdvice(ui, facts, via ?? '')
  if (kind === 'lan') return `Check that ${facts.name} is on and that ${facts.device.toLowerCase()} is on the same wifi.`
  if (kind === 'tailscale') return `Check that ${facts.name} is on and that Tailscale is on and signed in on both ${facts.name} and ${facts.device.toLowerCase()}.`
  return `Check that sand is running on ${facts.name}.`
}

export const routeAdvice = (ui: Ui, facts: Facts) => {
  const latest = latestAttempts(facts.diagnosis)
  const texts = (facts.diagnosis?.routes ?? [])
    .filter(entry => !entry.blocked)
    .sort((a, b) => a.rank - b.rank)
    .flatMap(entry => {
      const attempt = latest.get(entry.route.key)
      return attempt && failed.has(attempt.result) ? [adviceFor(ui, facts, entry, attempt)] : []
    })
  return [...new Set(texts)].map(text => ({ text }))
}
