import { pcs } from '@sand/devices-contract'
import { projects, type ProjectGroup } from '@sand/web-client/contract'
import { derive, div, list, show, type Sig } from '@vaakx-dev/vrui'
import type { Parts } from '../parts'

export interface Fresh {
  open: Sig<boolean>
  name: Sig<string>
}

export interface ChecklistProps {
  chosen(): string[]
  toggle(project: string): void
  fresh: Fresh
  only?(group: ProjectGroup): boolean
}

const folderOf = (group: ProjectGroup) => group.locations[0]?.path ?? 'No folder on this PC'

export const createProject = async (parts: Parts, name: string) => {
  const service = parts.ctx.get(projects)
  if (!service) throw new Error('Projects are not available')
  const device = parts.ctx.get(pcs)?.list().find(pc => pc.home)?.id
  if (!device) throw new Error('No PC to make the project folder on')
  const entry = await service.create(name.trim(), device)
  return entry.project
}

export const projectChecklist = (parts: Parts, { chosen, toggle, fresh, only = () => true }: ChecklistProps) => {
  const { checkRow, textInput } = parts.ctx.kit
  const shown = derive(() => parts.projects.get().filter(group => only(group) && (!group.hidden || chosen().includes(group.id))))
  return div(
    { class: 'flex flex-col' },
    list(
      shown,
      group => group.id,
      group =>
        checkRow({
          surface: 'raised',
          title: () => parts.shown(group.get().id).name,
          meta: () => folderOf(group.get()),
          checked: () => chosen().includes(group.get().id),
          onToggle: () => toggle(group.get().id),
        }),
      div({ class: 'flex flex-col' }),
    ),
    checkRow({ surface: 'raised', title: 'New project', meta: 'An empty folder in your projects folder', checked: () => fresh.open.get(), onToggle: () => fresh.open.update(open => !open) }),
    show(
      () => fresh.open.get(),
      () =>
        div(
          { class: 'pt-1 pb-2 pl-10' },
          textInput({ bindValue: fresh.name, placeholder: 'Project name', 'aria-label': 'New project name', maxLength: 80, onMount: node => node.focus() }),
        ),
    ),
  )
}
