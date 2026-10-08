import type { PalettePage } from '@sand/protocol'
import { finish } from './finish'
import type { Choice, FlowContext } from './types'

const verbs: Record<Choice['how'], string> = {
  add: 'Add project',
  'create-folder': 'Create folder and add',
  create: 'Create project',
  clone: 'Clone and add',
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
    ],
    action: verbs[choice.how],
    run: progress => finish(ctx, choice, progress),
  },
})
