import type { Tool } from '@sand/tools/contract'
import { join } from 'node:path'
import { z } from 'zod'
import type { LoopTrial } from './contract'
import { draftsDir, shortPath } from './draft/paths'
import { reportText } from './summary'

const input = z.object({
  plugin: z.string().describe('Folder name of the draft plugin'),
  apply: z.boolean().optional().describe('Install the draft when it passes (default true)'),
})

export const trialTool = (home: string, trial: LoopTrial): Tool<typeof input> => ({
  name: 'loop_trial',
  description: `Test a draft loop plugin in ${shortPath(join(draftsDir(home), '<plugin>'))} on a scripted model, without a real model call. When it passes it replaces the installed plugin of the same name, which the user then loads with /reload. Installed loop plugins can only change this way.`,
  input,
  async run({ plugin, apply }, { session }) {
    return reportText(await trial.run(plugin, { apply: apply ?? true, parent: session }))
  },
})
