import type { PalettePage, PaletteReviewRow } from '@sand/palette/contract'
import type { ProjectsContext } from '../context'
import { finish } from './finish'
import type { Choice } from './types'
import { isThisPc } from './where'

const verbs: Record<Choice['how'], string> = {
  add: 'Add project',
  'create-folder': 'Create folder and add',
  create: 'Create project',
}

const actionLabel = (choice: Choice) => {
  if (choice.existing) return 'Open project'
  return choice.project ? 'Add as a copy' : verbs[choice.how]
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
      { label: 'On', value: `${choice.pc.name}${isThisPc(choice.pc) ? ' (this PC)' : ''}` },
      { label: 'Folder', value: `${choice.path}${choice.how === 'add' ? '' : ' — new'}`, mono: true },
      ...projectRow(ctx, choice),
    ],
    action: actionLabel(choice),
    run: progress => finish(ctx, choice, progress),
  },
})
