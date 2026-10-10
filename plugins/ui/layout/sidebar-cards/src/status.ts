import type { NavItem } from '@sand/dom'
import { ago, derive, dot, dynamicChild, elapsed, exactTime, icon, navStatus, span, working, type Sig } from '@sand/dom'

const busy = new Set(['running', 'background', 'waiting', 'draft'])

const kindOf = (value: NavItem) => {
  if (busy.has(value.state)) return value.state
  if (value.snoozed) return 'snoozed'
  if (value.back) return 'back'
  return value.unread ? 'unread' : ''
}

const agents = (count: number) => `${count} agent${count === 1 ? '' : 's'}`

const startedTitle = (at?: number) => (at ? `Started ${exactTime(at)}` : 'Working')

const left = (until: number) => {
  const minutes = Math.max(1, Math.ceil((until - Date.now()) / 60_000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / (24 * 60))}d`
}

const ticking = (minute: Sig<number>, read: () => string) =>
  derive(() => {
    minute.get()
    return read()
  })

export const status = (item: Sig<NavItem>, minute: Sig<number>) =>
  dynamicChild(item.map(kindOf), kind => {
    if (kind === 'running') {
      const title = item.map(value => startedTitle(value.started))
      return span(
        { class: 'inline-flex items-center gap-1 font-medium text-accent-400', title },
        working(14, title),
        'Working',
        span({ class: 'font-normal' }, elapsed(item.map(value => value.started))),
      )
    }
    if (kind === 'background') {
      const title = item.map(value => navStatus(value))
      return span(
        { class: 'inline-flex items-center gap-1 font-medium text-sky-400', title },
        icon('bot', 14),
        item.map(value => agents(value.jobs ?? 1)),
        span({ class: 'font-normal' }, elapsed(item.map(value => value.started))),
      )
    }
    if (kind === 'waiting') return span({ class: 'inline-flex items-center gap-1' }, dot('warning'), span({ class: 'font-medium text-warning-400' }, 'Needs you'))
    if (kind === 'draft') return span({ class: 'inline-flex items-center gap-1 font-medium text-sky-400' }, icon('pencil', 11), 'Draft')
    if (kind === 'snoozed')
      return span(
        { class: 'inline-flex items-center gap-1 tabular-nums text-neutral-500', title: () => `Back ${exactTime(item.get().snoozed)}` },
        icon('snooze', 12),
        ticking(minute, () => left(item.get().snoozed ?? Date.now())),
      )
    if (kind === 'back') return span({ class: 'inline-flex items-center gap-1 font-medium text-accent-400', title: 'Back from snooze' }, icon('snooze', 12), 'back')
    if (kind === 'unread') return span({ class: 'text-orange-400', title: navStatus(item.get()) }, '✦ new')
    return span({ class: 'tabular-nums text-neutral-500', title: () => exactTime(item.get().updated) }, ticking(minute, () => ago(item.get().updated)))
  })
