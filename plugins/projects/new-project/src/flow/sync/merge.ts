import type { ProjectRef } from '@sand/host-projects/contract'
import type { PalettePage } from '@sand/palette/contract'
import type { FlowContext } from '../types'

export const mergePrompt = (files: string[]) =>
  `Resolve the merge conflicts in ${files.join(', ')}. Each has conflict markers with both PCs' versions. Keep both sets of changes, remove the markers, run the project's tests and tell me what you did.`

export const mergePage = (ctx: FlowContext, ref: ProjectRef, files: string[], here: string, other: string): PalettePage => ({
  id: 'merge-prompt',
  title: 'Let sand merge them',
  field: {
    kind: 'text',
    value: mergePrompt(files),
    placeholder: 'Merge instructions',
    action: value => ({ label: 'Start merge', enabled: Boolean(value.trim()) }),
    async submit(value) {
      const turns = ctx.turns
      if (!turns) throw new Error('Agent turns are not available')
      const thread = await ctx.threads.create({ cwd: ref.path, device: ref.device, title: `Merge ${other} into ${here}` })
      await turns.send(thread.id, value.trim())
      await ctx.threads.select(thread.id)
    },
  },
})
