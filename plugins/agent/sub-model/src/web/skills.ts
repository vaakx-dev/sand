import type { NavAction } from '@sand/nav/contract'
import type { ContextMenu } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import { type Job, subModelSkill } from '../contract'
import type { Rows } from './context'

const none = 'No skill'

const names = ({ ctx }: Rows, picked: string | undefined) => {
  const known = ctx.skillIndex.list().map(skill => skill.name)
  return picked && !known.includes(picked) ? [...known, picked] : known
}

const skillActions = (rows: Rows, job: Job): NavAction[] => {
  const { ctx, state } = rows
  const picked = state.get()?.skills[job.id]
  const choose = (skill: string | null) => () => void ctx.wire.call(subModelSkill, { job: job.id, skill }).catch(error => ctx.report(error))
  const action = (skill: string | null): NavAction => ({
    id: skill ?? '',
    label: skill ?? none,
    ...(skill === (picked ?? null) && { icon: 'check' }),
    ...(skill === null && { group: 'none' }),
    run: choose(skill),
  })
  return [action(null), ...names(rows, picked).map(action)]
}

const skillButton = (rows: Rows, menu: ContextMenu, job: Job) =>
  rows.ctx.kit.chipButton(
    {
      active: false,
      menu: true,
      'aria-label': `Skill for ${job.label}`,
      'aria-haspopup': 'menu',
      onClick: (event: MouseEvent) => {
        const from = event.currentTarget
        if (!(from instanceof HTMLElement)) return
        const box = from.getBoundingClientRect()
        const touch = event instanceof PointerEvent && event.pointerType === 'touch'
        menu.open({ x: box.left, y: box.bottom, touch, from, title: job.label, actions: skillActions(rows, job) })
      },
    },
    span({ class: 'min-w-0 truncate' }, () => rows.state.get()?.skills[job.id] ?? none),
  )

export const jobRows = (rows: Rows) => {
  const { contextMenu, rowList, settingsRow } = rows.ctx.kit
  const menu = contextMenu()
  return [
    menu.view(),
    rowList(
      rows.state.map(state => state?.jobs ?? []),
      job => job.id,
      job => settingsRow({ title: job.get().label, class: 'pl-8' }, skillButton(rows, menu, job.get())),
    ),
  ]
}
