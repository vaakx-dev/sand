import type { PullOutput } from '@sand/orrin/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Deps } from './deps'
import { conflictLines, ownView } from './land'

const input = z.object({})

const pulledOut = (result: PullOutput) => {
  const changed = result.changed.length ? `Brought changes from main into ${result.changed.join(', ')}.` : 'Your view is up to date with main.'
  return result.conflicts.length ? `${changed}\n\nClashes:\n${conflictLines(result.conflicts)}` : changed
}

export const pullTool = (deps: Deps): Tool<typeof input> => ({
  name: 'pull',
  description:
    'Bring newer changes from main into your Orrin view. Files you also changed are merged; where both sides changed the same lines the file gets conflict markers (<<<<<<< yours, =======, >>>>>>> incoming) to fix before you land.',
  input,
  active: session => ownView(deps, session) !== undefined,
  async run(_input, { session, signal }) {
    return pulledOut(await deps.orrin()!.call('view.pull', { view: ownView(deps, session)! }, signal))
  },
})
