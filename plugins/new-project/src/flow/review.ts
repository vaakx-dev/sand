import type { PalettePage, PaletteReviewRow } from '@sand/protocol'
import { finish } from './finish'
import type { Choice, FlowContext } from './types'

const verbs: Record<Choice['how'], string> = {
  add: 'Add project',
  'create-folder': 'Create folder and add',
  create: 'Create project',
  clone: 'Clone and add',
}

const projectRow = (ctx: FlowContext, choice: Choice): PaletteReviewRow[] => {
  const name = (id: string) => ctx.projects.get(id)?.name ?? 'a project'
  if (choice.existing) return [{ label: 'Project', value: `already added as ${name(choice.existing)}` }]
  if (choice.project) return [{ label: 'Project', value: `copy of ${name(choice.project)}` }]
  return []
}

export const reviewPage = (ctx: FlowContext, choice: Choice): PalettePage => ({
  id: 'review',
  title: 'Review',
  review: {
    rows: [
      { label: 'Source', value: choice.source },
      { label: 'On', value: `${choice.machine.name}${choice.machine.local ? ' (this device)' : ''}` },
      ...(choice.repo ? [{ label: 'Repository', value: choice.repo.url, mono: true }] : []),
      { label: 'Folder', value: `${choice.path}${choice.how === 'add' ? '' : ' — new'}`, mono: true },
      ...projectRow(ctx, choice),
    ],
    action: choice.existing ? 'Open project' : choice.project ? (choice.how === 'clone' ? 'Clone as a copy' : 'Add as a copy') : verbs[choice.how],
    run: progress => finish(ctx, choice, progress),
  },
})
