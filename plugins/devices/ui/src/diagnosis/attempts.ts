import type { Attempt, RouteEntry } from '@sand/devices-contract'
import type { IconName } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import { routeIcons } from '../details/routes/row'
import { agoWords } from '../shared/time'
import { msWords, routeAddress, routeWords } from '../status/words'
import type { Ui } from '../ui'
import { type Facts, latestAttempts } from './facts'

type ResultTone = 'ok' | 'bad' | 'warn' | 'none'

interface Outcome {
  tone: ResultTone
  icon?: IconName
  text: string
  detail?: string
}

const toneText: Record<ResultTone, string> = { ok: 'text-success-400', bad: 'text-danger-400', warn: 'text-warning-400', none: 'text-neutral-500' }

const seconds = (ms: number | undefined) => `${Math.max(1, Math.round((ms ?? 0) / 1000))} s`

const outcomeOf = (entry: RouteEntry, attempt: Attempt | undefined): Outcome => {
  if (entry.blocked === 'disabled') return { tone: 'none', text: 'Off' }
  if (entry.blocked === 'blocked-https' || attempt?.result === 'blocked-https')
    return { tone: 'warn', icon: 'lock', text: 'Blocked on secure pages', detail: 'This page is secure and that address isn’t, so the browser won’t use it.' }
  if (!attempt) return { tone: 'none', text: 'Not tried yet' }
  const bad = (text: string, detail?: string): Outcome => ({ tone: 'bad', icon: 'circle-x', text, ...(detail && { detail }) })
  if (attempt.result === 'ok') return { tone: 'ok', icon: 'check', text: ['Connected', msWords(attempt.ms)].filter(Boolean).join(' · ') }
  if (attempt.result === 'timeout') return bad(`No answer in ${seconds(attempt.ms)}`)
  if (attempt.result === 'refused') return bad('Refused')
  if (attempt.result === 'wrong-pc') return bad('A different PC answered')
  if (attempt.result === 'not-allowed') return bad('Not allowed', attempt.error)
  return bad('Failed', attempt.error)
}

const attemptRow = (ui: Ui, facts: Facts, entry: RouteEntry, attempt: Attempt | undefined) => {
  const { icon, settingsRow } = ui.kit
  const outcome = outcomeOf(entry, attempt)
  return settingsRow(
    {
      lead: span({ class: 'inline-flex text-neutral-400' }, icon(routeIcons[entry.route.kind], 'md')),
      title: routeWords(entry.route, facts.nameOf),
      detail: outcome.detail ?? routeAddress(entry.route) ?? '',
    },
    span(
      { class: ['inline-flex items-center gap-1.5 text-xs whitespace-nowrap', toneText[outcome.tone]] },
      outcome.icon ? icon(outcome.icon, 'sm') : null,
      outcome.text,
    ),
  )
}

export const attemptsSection = (ui: Ui, facts: Facts) => {
  const { emptyState, settingsSection } = ui.kit
  const latest = latestAttempts(facts.diagnosis)
  const routes = [...(facts.diagnosis?.routes ?? [])].sort((a, b) => a.rank - b.rank)
  const last = Math.max(0, ...[...latest.values()].map(attempt => attempt.at))
  return settingsSection(
    { title: last ? `What sand tried · ${agoWords(last)}` : 'What sand tried' },
    ...(routes.length
      ? routes.map(entry => attemptRow(ui, facts, entry, latest.get(entry.route.key)))
      : [emptyState({ surface: 'group', text: 'sand doesn’t know any address for it yet.' })]),
  )
}
