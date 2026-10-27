import type { Kit } from '@sand/ui-kit/contract'
import { ago, exactTime } from '@sand/util'
import { derive, dynamicChild, show, span, type Child, type MaybeReactive, type Sig } from '@vaakx-dev/vrui'
import type { ThreadItem } from '../items/item'
import { agentMark, draftMark, itemMark, itemStatus } from './marks'

const busy = new Set(['running', 'background', 'draft'])

const kindOf = (value: ThreadItem) => {
  if (busy.has(value.state)) return value.state
  if (value.snoozed) return 'snoozed'
  if (value.back) return 'back'
  return value.unread ? 'unread' : ''
}

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
const statusText = (tone: string, title: MaybeReactive<string>, ...children: Child[]) =>
  span({ class: ['inline-flex items-center gap-1 tabular-nums', tone], title }, ...children)

const extra = (kit: Kit, count: Sig<number | undefined>) =>
  show(count.map(Boolean), () => statusText('text-neutral-400', 'Agents running', count.map(value => `+${value}`), agentMark(kit)))

const runningStatus = (kit: Kit, item: Sig<ThreadItem>) => {
  const { elapsed, working } = kit
  const title = item.map(value => [startedTitle(value.started), value.agents && itemStatus(value)].filter(Boolean).join(' · '))
  return span(
    { class: 'inline-flex items-center gap-2', title },
    statusText('text-accent-400', title, working(14, title), elapsed(item.map(value => value.started))),
    extra(
      kit,
      item.map(value => value.agents),
    ),
  )
}

const backgroundStatus = (kit: Kit, item: Sig<ThreadItem>) =>
  statusText('text-neutral-400', item.map(itemStatus), agentMark(kit), kit.elapsed(item.map(value => value.started)))

export const status = (kit: Kit, item: Sig<ThreadItem>, minute: Sig<number>) => {
  const { icon } = kit
  return dynamicChild(item.map(kindOf), kind => {
    if (kind === 'running') return runningStatus(kit, item)
    if (kind === 'background') return backgroundStatus(kit, item)
    if (kind === 'draft') return statusText('text-neutral-400', 'Draft', draftMark(kit), 'Draft')
    if (kind === 'snoozed')
      return statusText(
        'text-neutral-500',
        () => `Back ${exactTime(item.get().snoozed ?? Date.now())}`,
        icon('snooze', 14),
        ticking(minute, () => left(item.get().snoozed ?? Date.now())),
      )
    if (kind === 'back') return statusText('text-accent-400', 'Back from snooze', icon('snooze', 14), 'Back')
    if (kind === 'unread') return span({ class: 'inline-flex', title: itemStatus(item.get()) }, itemMark(kit, item.get()))
    return statusText('text-neutral-500', () => exactTime(item.get().updated), ticking(minute, () => ago(item.get().updated)))
  })
}
