import { ago, exactTime, navJobs, navStatus } from '@sand/kit'
import type { NavItem } from '@sand/protocol'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, show, span, type Sig } from '@vaakx-dev/vrui'

const busy = new Set(['running', 'background', 'waiting', 'draft'])

const kindOf = (value: NavItem) => {
  if (busy.has(value.state)) return value.state
  if (value.snoozed) return 'snoozed'
  if (value.back) return 'back'
  return value.unread ? 'unread' : ''
}

const startedTitle = (at?: number) => (at ? `Started ${exactTime(at)}` : 'Working')

const backgroundLabel = (item: NavItem) => {
  const { workflow } = item
  if (!workflow) return navJobs(item)
  return workflow.total ? `Workflow ${workflow.done}/${workflow.total}` : 'Workflow'
}

const backgroundMark = ({ agents, workflow }: NavItem) => {
  if (workflow) return 'workflow'
  return agents ? 'agent' : 'shell'
}

const extra = ({ stateMark }: Kit, count: Sig<number | undefined>, mark: 'agent' | 'shell') =>
  show(count.map(Boolean), () => span({ class: 'inline-flex items-center gap-px text-sky-400' }, count.map(value => `+${value}`), stateMark(mark)))

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

const runningStatus = (kit: Kit, item: Sig<NavItem>) => {
  const { elapsed, working } = kit
  const title = item.map(value => [startedTitle(value.started), navJobs(value) && navStatus(value)].filter(Boolean).join(' · '))
  return span(
    { class: 'inline-flex items-center gap-2', title },
    span(
      { class: 'inline-flex items-center gap-1 font-medium text-accent-400' },
      working(14, title),
      'Working',
      span({ class: 'font-normal' }, elapsed(item.map(value => value.started))),
    ),
    extra(kit, item.map(value => value.agents), 'agent'),
    extra(kit, item.map(value => value.shells), 'shell'),
  )
}

const backgroundStatus = ({ elapsed, icon, stateMark }: Kit, item: Sig<NavItem>) =>
  span(
    { class: 'inline-flex items-center gap-1 font-medium text-sky-400', title: item.map(navStatus) },
    dynamicChild(item.map(backgroundMark), mark => (mark === 'workflow' ? icon('workflow', 12) : stateMark(mark))),
    item.map(backgroundLabel),
    span({ class: 'font-normal' }, elapsed(item.map(value => value.started))),
  )

export const status = (kit: Kit, item: Sig<NavItem>, minute: Sig<number>) => {
  const { icon, navMark } = kit
  return dynamicChild(item.map(kindOf), kind => {
    if (kind === 'running') return runningStatus(kit, item)
    if (kind === 'background') return backgroundStatus(kit, item)
    if (kind === 'waiting') return span({ class: 'inline-flex items-center gap-1' }, navMark(item.get()), span({ class: 'font-medium text-warning-400' }, 'Needs you'))
    if (kind === 'draft') return span({ class: 'inline-flex items-center gap-1 font-medium text-sky-400' }, navMark(item.get()), 'Draft')
    if (kind === 'snoozed')
      return span(
        { class: 'inline-flex items-center gap-1 tabular-nums text-neutral-500', title: () => `Back ${exactTime(item.get().snoozed)}` },
        icon('snooze', 12),
        ticking(minute, () => left(item.get().snoozed ?? Date.now())),
      )
    if (kind === 'back') return span({ class: 'inline-flex items-center gap-1 font-medium text-accent-400', title: 'Back from snooze' }, icon('snooze', 12), 'Back')
    if (kind === 'unread') return span({ class: 'inline-flex', title: navStatus(item.get()) }, navMark(item.get()))
    return span({ class: 'tabular-nums text-neutral-500', title: () => exactTime(item.get().updated) }, ticking(minute, () => ago(item.get().updated)))
  })
}
