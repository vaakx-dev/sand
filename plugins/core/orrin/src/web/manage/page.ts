import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show } from '@vaakx-dev/vrui'
import type { OrrinProjects } from '../../contract'
import { projectRow, type ProjectActions } from './project'
import type { ProjectSource } from './source'

const emptyText = (state: OrrinProjects | undefined) => {
  if (!state) return 'Loading…'
  if (!state.running) return 'Orrin is not running. Start it from Connections to see its projects.'
  return 'Orrin has no projects yet. Add a folder as a project in sand and it shows up here.'
}

export const managePage = (kit: Kit, source: ProjectSource, actions: ProjectActions) => {
  const { errorRow, hintRow, pageHead, rowList, settingsSection, secondaryAction } = kit
  const projects = derive(() => source.state.get()?.projects ?? [])
  return div(
    { class: 'flex flex-col gap-6' },
    pageHead(
      'Projects Orrin keeps on this PC, with the worker views agents have open in them.',
      secondaryAction({ size: 'sm', disabled: source.busy, onClick: () => void source.refresh() }, 'Refresh'),
    ),
    show(
      () => !!source.error.get(),
      () => settingsSection({}, errorRow(() => source.error.get() ?? '')),
    ),
    dynamicChild(
      projects.map(list => list.length > 0),
      any =>
        settingsSection(
          { title: 'Projects' },
          any ? rowList(projects, project => project.id, row => projectRow(kit, row, actions)) : hintRow(() => emptyText(source.state.get())),
        ),
    ),
  )
}
