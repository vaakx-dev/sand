import type { Kit } from '@sand/ui-kit/contract'
import { clock, div, show, sig, span, type Child } from '@vaakx-dev/vrui'
import type { Answer, Blocked, Decision } from '../contract'

export interface Choice {
  label: string
  answer: Answer
}

const MINUTE_MS = 60_000

const wants: Record<Decision['effect'], string> = {
  read: 'wants to read outside its folder',
  write: 'wants to change files outside its folder',
  run: 'wants to run',
  send: 'wants to send',
  spend: 'wants to spend',
  delete: 'wants to delete',
}

const uses: Record<NonNullable<Decision['uses']>, string> = {
  login: 'wants to use a saved login',
  agents: 'wants to start agents',
}

const note = (...children: Child[]) => span({ class: 'shrink-0 text-xs text-neutral-500' }, ...children)


const asked = (decision: Decision) => {
  if (decision.blocked.length) return 'was blocked by auto 3 times in a row'
  return decision.uses ? uses[decision.uses] : wants[decision.effect]
}

const leftText = (deadline: number, now: number) => `${Math.max(1, Math.ceil((deadline - now) / MINUTE_MS))} min left`

const due = (decision: Decision) => {
  if (decision.outcome === 'expired') return note('timed out')
  const now = clock(MINUTE_MS / 4)
  const deadline = decision.deadline ?? decision.at
  return note(() => leftText(deadline, now.get()))
}

const blockedLine = (kit: Kit, { summary, reason }: Blocked) =>
  div({ class: 'flex min-w-0 flex-col' }, kit.monoMeta(summary), span({ class: 'text-xs text-neutral-500' }, reason))

const earlier = (kit: Kit, decision: Decision) => {
  const open = sig(false)
  const all = [...decision.blocked, { summary: decision.summary, reason: decision.reason ?? '' }]
  return {
    toggle: note(kit.textToggle(open, 'why')),
    list: show(open, () => div({ class: 'flex min-w-0 flex-col gap-2 pt-1' }, ...all.map(found => blockedLine(kit, found)))),
  }
}

export const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export const questionHead = (decision: Decision) => span({}, sentence(asked(decision)), span({ class: 'font-normal text-neutral-400' }, ` · ${decision.title}`))

export const questionBody = (kit: Kit, decision: Decision) => {
  const blocked = decision.blocked.length ? earlier(kit, decision) : undefined
  return div(
    { class: 'flex min-w-0 flex-col' },
    div({ class: 'flex min-w-0 items-baseline gap-2' }, kit.monoMeta(decision.summary), due(decision), blocked?.toggle ?? null),
    blocked?.list ?? null,
  )
}

export const choicesOf = (decision: Decision): [Choice, ...Choice[]] =>
  decision.once
    ? [
        { label: 'Allow', answer: 'once' },
        { label: 'Deny', answer: 'deny' },
      ]
    : [
        { label: 'Allow once', answer: 'once' },
        { label: 'Always allow', answer: 'always' },
        { label: decision.outcome === 'expired' ? 'Dismiss' : 'Deny', answer: 'deny' },
      ]
