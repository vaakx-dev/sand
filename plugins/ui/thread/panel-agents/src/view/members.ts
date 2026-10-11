import { div, dot, dynamicChild, list, show, sig, span, type Child, type Sig } from '@sand/dom'
import type { Member } from '../runs/runs'
import { agentMenu } from './menu'
import { pressable, since, type Rows } from './parts'
import { stopButton } from './stop'

const lineClass = 'flex h-8 items-center gap-3 px-2 text-sm'

const meta = (...children: Child[]) => span({ class: 'shrink-0 text-xs tabular-nums text-neutral-500' }, ...children)

const memberMenu = (member: Member, rows: Rows) =>
  agentMenu(rows, { title: member.title, session: member.id, stop: member.running ? () => rows.interrupt(member.id) : undefined })

const memberRow = (member: Sig<Member>, now: Sig<number>, rows: Rows) =>
  pressable(
    { class: lineClass, press: () => rows.open(member.get().id), menu: { on: rows.menu, spec: () => memberMenu(member.get(), rows) } },
    dynamicChild(
      member.map(value => value.running),
      running => dot(running ? 'accent' : 'success'),
    ),
    span({ class: 'min-w-0 flex-1 truncate text-neutral-200', title: member.map(value => value.title) }, member.map(value => value.title)),
    meta(() => {
      const value = member.get()
      return [value.model, since(value.started, value.ended, now.get())].filter(Boolean).join(' · ')
    }),
    show(
      member.map(value => value.running),
      () => stopButton(() => rows.interrupt(member.get().id)),
    ),
  )

export const memberRows = (members: Sig<Member[]>, now: Sig<number>, rows: Rows) =>
  list(members, member => member.id, member => memberRow(member, now, rows), div({ class: 'flex flex-col' }))

export const memberList = (members: Sig<Member[]>, now: Sig<number>, rows: Rows) => {
  const running = members.map(all => all.filter(member => member.running))
  const done = members.map(all => all.filter(member => !member.running))
  const open = sig(false)
  return div(
    memberRows(running, now, rows),
    show(
      done.map(items => items.length > 0),
      () =>
        pressable(
          { class: lineClass, press: open.toggle() },
          dot('success'),
          span({ class: 'min-w-0 flex-1 truncate text-neutral-500' }, () => `${done.get().length} done`),
          meta(() => (open.get() ? 'hide' : 'show')),
        ),
    ),
    show(open, () => memberRows(done, now, rows)),
  )
}
