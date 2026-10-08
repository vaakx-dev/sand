import type { Command, Project, UI } from '@sand/protocol'
import type { ProjectLibrary } from './library'

const marks = (project: Project) =>
  [project.hidden && 'hidden', project.link && 'linked', project.missing && 'missing'].filter(Boolean).join(', ')

const listing = (library: ProjectLibrary) => {
  const { projects } = library.list()
  if (!projects.length) return 'No projects yet.'
  return projects
    .map(project => `${project.name} · ${project.path} · ${project.threads} threads${marks(project) ? ` · ${marks(project)}` : ''}`)
    .join('\n')
}

const lead = (library: ProjectLibrary, text: string) => {
  const words = text.split(/\s+/).filter(Boolean)
  for (let count = words.length; count > 0; count--) {
    const project = library.find(words.slice(0, count).join(' '))
    if (project) return { project, rest: words.slice(count).join(' ') }
  }
  return undefined
}

const usage = 'Usage: /project [add <path> | remove <name> | rename <name> <new name> | hide <name> | show <name> | root [path]]'

export const projectCommand = (ui: UI, library: ProjectLibrary): Command => ({
  name: 'project',
  title: 'Projects',
  description: 'List projects, or add, remove, rename, hide or show one, or set the projects folder',
  args: '[add|remove|rename|hide|show|root]',
  async run(args) {
    const [action, ...words] = args.trim().split(/\s+/)
    const value = words.join(' ')
    if (!action) return ui.notify(listing(library))
    if (action === 'root') return ui.notify(value ? `Projects folder is ${(await library.setRoot(value)).root}` : library.list().root)
    if (action === 'add' && value) return ui.notify(`Saved ${(await library.add(value))?.name}`)
    const found = lead(library, value)
    if (!found) return ui.notify(value ? `No project matches ${value}` : usage, 'error')
    const { project, rest } = found
    if (action === 'remove') {
      await library.remove(project.path)
      return ui.notify(`Removed ${project.name} from projects`)
    }
    if (action === 'hide' || action === 'show') {
      await library.update(project.path, { hidden: action === 'hide' })
      return ui.notify(`${action === 'hide' ? 'Hid' : 'Showing'} ${project.name}`)
    }
    if (action === 'rename' && rest) {
      await library.update(project.path, { name: rest })
      return ui.notify(`Renamed ${project.name} to ${rest}`)
    }
    ui.notify(usage, 'error')
  },
})
