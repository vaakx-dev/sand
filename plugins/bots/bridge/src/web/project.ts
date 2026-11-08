import { botUpdate } from '@sand/bots/contract'
import { type ProjectGroup, projectsChange } from '@sand/web-client/contract'
import { sig, span } from '@vaakx-dev/vrui'
import type { BridgeWeb } from './context'
import type { Roster } from './roster'

interface ProjectChoice {
  value: string | null
  label: string
}

const nameOf = (groups: ProjectGroup[], project: string) => groups.find(group => group.id === project)?.name ?? `${project} (unknown)`

const labelOf = (groups: ProjectGroup[], projects: string[]) => (projects.length ? projects.map(project => nameOf(groups, project)).join(', ') : 'None')

const toggled = (projects: string[], project: string | null) => {
  if (project === null) return []
  return projects.includes(project) ? projects.filter(other => other !== project) : [...projects, project]
}

const holds = (projects: string[], project: string | null) => (project === null ? !projects.length : projects.includes(project))

export const projectSection = (ctx: BridgeWeb, roster: Roster) => {
  const { chipButton, choiceItem, dropdown, settingsRow, settingsSection } = ctx.kit
  const read = () => ctx.projects.groups({ hidden: true })
  const groups = sig(read())
  ctx.on(projectsChange, () => groups.set(read()))

  return (bot: string) => {
    const current = () => roster.find(bot)?.projects ?? []
    const choices = (): ProjectChoice[] => [
      { value: null, label: 'None' },
      ...groups
        .get()
        .filter(group => !group.hidden || current().includes(group.id))
        .map(group => ({ value: group.id, label: group.name })),
    ]
    const save = (projects: string[]) => void ctx.wire.call(botUpdate, { bot, patch: { projects } }).catch(error => ctx.report(error))
    return settingsSection(
      {},
      settingsRow(
        { title: 'Projects', detail: 'The projects it plans and starts threads in' },
        dropdown({
          placement: 'below-right',
          class: 'shrink-0',
          menuClass: 'max-h-96 overflow-y-auto',
          trigger: (press, open) =>
            chipButton({ ...press, active: open, menu: true, 'aria-label': 'Projects' }, span({ class: 'min-w-0 truncate' }, () => labelOf(groups.get(), current()))),
          items: close =>
            choices().map(choice =>
              choiceItem(
                {
                  selected: () => holds(current(), choice.value),
                  onClick: () => {
                    close()
                    save(toggled(current(), choice.value))
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
