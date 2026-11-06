import { botUpdate } from '@sand/bots/contract'
import { type ProjectGroup, projectsChange } from '@sand/web-client/contract'
import { sig, span } from '@vaakx-dev/vrui'
import type { BridgeWeb } from './context'
import type { Roster } from './roster'

interface ProjectChoice {
  value: string | null
  label: string
}

const labelOf = (groups: ProjectGroup[], project: string | null) => {
  if (project === null) return 'None'
  return groups.find(group => group.id === project)?.name ?? `${project} (unknown)`
}

export const projectSection = (ctx: BridgeWeb, roster: Roster) => {
  const { chipButton, choiceItem, dropdown, settingsRow, settingsSection } = ctx.kit
  const read = () => ctx.projects.groups({ hidden: true })
  const groups = sig(read())
  ctx.on(projectsChange, () => groups.set(read()))

  return (bot: string) => {
    const current = () => roster.find(bot)?.project ?? null
    const choices = (): ProjectChoice[] => [
      { value: null, label: 'None' },
      ...groups
        .get()
        .filter(group => !group.hidden || group.id === current())
        .map(group => ({ value: group.id, label: group.name })),
    ]
    const save = (project: string | null) => void ctx.wire.call(botUpdate, { bot, patch: { project } }).catch(error => ctx.report(error))
    return settingsSection(
      {},
      settingsRow(
        { title: 'Project', detail: 'Where its threads start when it names none' },
        dropdown({
          placement: 'below-right',
          class: 'shrink-0',
          menuClass: 'max-h-96 overflow-y-auto',
          trigger: (press, open) =>
            chipButton({ ...press, active: open, menu: true, 'aria-label': 'Project' }, span({ class: 'min-w-0 truncate' }, () => labelOf(groups.get(), current()))),
          items: close =>
            choices().map(choice =>
              choiceItem(
                {
                  selected: () => current() === choice.value,
                  onClick: () => {
                    close()
                    save(choice.value)
                  },
                },
                span({ class: 'min-w-0 flex-1 truncate' }, choice.label),
              ),
            ),
        }),
      ),
    )
  }
}
