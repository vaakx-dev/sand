import { composer, draftsChange } from '@sand/composer/contract'
import { machinesChange, projectsChange, threadSelect, threadsChange, type Machine } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import { div, dynamicChild, show, sig, SPACE, span } from '@vaakx-dev/vrui'
import type { DevicesContext } from '../inject'
import { pcChoices, type PcChoice } from './choices'

const tuck = `calc(${SPACE['4']} + ${SPACE['1']})`

const glyph = (machine: Machine) => (machine.local ? 'laptop' : 'monitor')

export const pcTab = (ctx: DevicesContext) => {
  const { chipPopover, choiceItem, icon, plainButton, pressOpens } = ctx.kit
  const open = sig(false)
  const close = () => open.set(false)
  const toggle = () => open.update(value => !value)

  const changes = pulse(ctx, [threadSelect, threadsChange, draftsChange, machinesChange, projectsChange])
  const draft = changes.read(() => ctx.threads.drafting())
  const chosen = changes.read(() => ctx.machines.get(draft.get()?.device ?? ''))
  const choices = changes.read(() => {
    const target = draft.get()
    return target ? pcChoices(ctx.machines, ctx.projects, target) : []
  })
  const visible = changes.read(() => Boolean(chosen.get()) && choices.get().length > 1)

  const pick = ({ machine, cwd }: PcChoice) => {
    const target = draft.get()
    close()
    if (!target || cwd === undefined || machine.id === target.device) return
    void ctx.threads.draft(cwd, machine.id, target.id).then(() => ctx.get(composer)?.focus())
  }

  const row = (choice: PcChoice) =>
    div(
      { title: choice.blocked ?? '' },
      choiceItem(
        { selected: choice.machine.id === draft.get()?.device, icon: glyph(choice.machine), disabled: Boolean(choice.blocked), onClick: () => pick(choice) },
        span({ class: 'min-w-0 flex-1 truncate' }, choice.machine.name),
      ),
    )

  const view = () =>
    div(
      { class: 'relative flex min-w-0' },
      plainButton(
        {
          class: [
            'flex min-w-0 items-center gap-1.5 rounded-b-xl bg-neutral-800/50 px-3 pb-1 text-xs transition-colors',
            () => (open.get() ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'),
          ],
          style: { marginTop: `calc(-1 * ${tuck})`, paddingTop: `calc(${tuck} + ${SPACE['1']})` },
          title: 'Choose which PC runs this thread',
          ...pressOpens(open, toggle),
        },
        dynamicChild(chosen, machine => icon(machine ? glyph(machine) : 'monitor', 12)),
        span({ class: 'min-w-0 truncate' }, () => chosen.get()?.name ?? ''),
      ),
      show(open, () =>
        chipPopover(
          close,
          { class: 'left-0', width: SPACE['64'] },
          dynamicChild(choices, list => div({ class: 'flex flex-col' }, ...list.map(row))),
        ),
      ),
    )

  return { view, visible }
}
