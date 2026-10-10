import { div, dot, dynamicChild, list, show, sig, span, type Child, type Sig } from '@sand/dom'
import { pressable, since, type Actions } from './parts'
import type { Member } from './runs'
import { stopButton } from './stop'

const line = (press: () => void, ...children: Child[]) => pressable(press, () => true, 'flex h-8 items-center gap-3 px-2 text-sm', ...children)

const meta = (...children: Child[]) => span({ class: 'shrink-0 text-xs tabular-nums text-neutral-500' }, ...children)

const memberRow = (member: Sig<Member>, now: Sig<number>, actions: Actions) =>
  line(
    () => actions.open(member.get().id),
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
      () => stopButton(() => actions.interrupt(member.get().id)),
    ),
  )

export const memberRows = (members: Sig<Member[]>, now: Sig<number>, actions: Actions) =>
  list(members, member => member.id, member => memberRow(member, now, actions), div({ class: 'flex flex-col' }))

export const memberList = (members: Sig<Member[]>, now: Sig<number>, actions: Actions) => {
  const running = members.map(all => all.filter(member => member.running))
  const done = members.map(all => all.filter(member => !member.running))
  const open = sig(false)
  return div(
    memberRows(running, now, actions),
    show(
      done.map(items => items.length > 0),
      () =>
        line(
          () => open.set(!open.get()),
          dot('success'),
          span({ class: 'min-w-0 flex-1 truncate text-neutral-500' }, () => `${done.get().length} done`),
          meta(() => (open.get() ? 'hide' : 'show')),
        ),
    ),
    show(open, () => memberRows(done, now, actions)),
  )
}
