import type { PalettePage, PaletteReviewRow } from '@sand/palette/contract'
import type { ProjectsContext } from '../context'
import { finish } from './finish'
import type { Choice } from './types'

const verbs: Record<Choice['how'], string> = {
  add: 'Add project',
  'create-folder': 'Create folder and add',
  create: 'Create project',
  clone: 'Clone and add',
}

const actionLabel = (choice: Choice) => {
  if (choice.existing) return 'Open project'
  if (!choice.project) return verbs[choice.how]
  return choice.how === 'clone' ? 'Clone as a copy' : 'Add as a copy'
}

const projectRow = (ctx: ProjectsContext, choice: Choice): PaletteReviewRow[] => {
  const name = (id: string) => ctx.projects.get(id)?.name ?? 'a project'
  if (choice.existing) return [{ label: 'Project', value: `already added as ${name(choice.existing)}` }]
  if (choice.project) return [{ label: 'Project', value: `copy of ${name(choice.project)}` }]
  return []
}

export const reviewPage = (ctx: ProjectsContext, choice: Choice): PalettePage => ({
  id: 'review',
  title: 'Review',
  review: {
    rows: [
      { label: 'Source', value: choice.source },
      { label: 'On', value: `${choice.machine.name}${choice.machine.local ? ' (this device)' : ''}` },
      ...(choice.how === 'clone' ? [{ label: 'Repository', value: choice.repo.url, mono: true }] : []),
      { label: 'Folder', value: `${choice.path}${choice.how === 'add' ? '' : ' — new'}`, mono: true },
      ...projectRow(ctx, choice),
    ],
    action: actionLabel(choice),
    run: progress => finish(ctx, choice, progress),
  },
})
