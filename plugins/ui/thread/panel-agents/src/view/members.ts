import { chevron, div, dot, dynamicChild, list, paneRow, show, sig, span, type Sig } from '@sand/dom'
import type { Member } from '../runs/runs'
import { agentMenu } from './menu'
import { meta, pressProps, since, type Rows } from './parts'
import { stopButton } from './stop'

const memberMenu = (member: Member, rows: Rows) =>
  agentMenu(rows, { title: member.title, session: member.id, stop: member.running ? () => rows.interrupt(member.id) : undefined })

const memberRow = (member: Sig<Member>, now: Sig<number>, rows: Rows) =>
  div(
    { class: 'flex items-center gap-1' },
    paneRow(
      pressProps({ press: () => rows.open(member.get().id), menu: { on: rows.menu, spec: () => memberMenu(member.get(), rows) } }),
      dynamicChild(
        member.map(value => value.running),
        running => dot(running ? 'accent' : 'success'),
      ),
      span({ class: 'min-w-0 flex-1 truncate', title: member.map(value => value.title) }, member.map(value => value.title)),
      meta(() => {
        const value = member.get()
        return [value.model, since(value.started, value.ended, now.get())].filter(Boolean).join(' · ')
      }),
    ),
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
        paneRow(
          { 'aria-expanded': () => String(open.get()), onClick: open.toggle() },
          dot('success'),
          span({ class: 'min-w-0 flex-1 truncate' }, () => `${done.get().length} done`),
          span({ class: 'inline-flex shrink-0 text-neutral-500' }, chevron(() => open.get(), 14)),
        ),
    ),
    show(open, () => memberRows(done, now, rows)),
  )
}
