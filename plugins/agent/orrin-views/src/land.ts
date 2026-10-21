import type { Session } from '@sand/chats/contract'
import type { Conflict, LandOutput, Orrin } from '@sand/orrin/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Deps } from './deps'
import { findView, folderIn } from './views'

const input = z.object({
  message: z.string().describe('One line on what changed; it becomes the change description'),
})

export const ownView = (deps: Deps, session: Session) => (session.kind === 'thread' && deps.orrin()?.available() ? (session.orrinView ?? undefined) : undefined)

export const conflictLines = (conflicts: Conflict[]) => conflicts.map(conflict => `- ${conflict.path}: ${conflict.reason}`).join('\n')

const clashOut = (result: LandOutput) =>
  `Not landed. Clashes:\n${conflictLines(result.conflicts)}\nRun pull to bring main into your view (clashing lines get conflict markers), fix those files, then land again.`

const skippedOut = (skipped: string[]) =>
  skipped.length ? ` The user's project folder kept its own copy of ${skipped.join(', ')}, because they are edited or open there.` : ''

const landedOut = (result: LandOutput) => `Landed in main${result.change ? ` as ${result.change.id}` : ''}.${skippedOut(result.skipped)}`

const moveOn = async (deps: Deps, orrin: Orrin, session: Session, view: string) => {
  const old = await findView(orrin, view)
  deps.sessions.update(session.id, { orrinView: null })
  const closed = old ? ` The old folder ${folderIn(orrin, session, old)} is closed and moved aside; don't read or write there.` : ''
  return `\n\nYour next tool call starts a fresh view from the new main, in a new folder.${closed}`
}

export const landTool = (deps: Deps): Tool<typeof input> => ({
  name: 'land',
  description:
    "Land your work: your thread's Orrin view goes into the project's main version. If it clashes, run pull, fix the listed files and land again. After landing your next tool call works in a fresh view in a new folder.",
  input,
  active: session => ownView(deps, session) !== undefined,
  async run({ message }, { session, signal }) {
    const orrin = deps.orrin()!
    const view = ownView(deps, session)!
    const result = await orrin.call('view.land', { view, intent: message }, signal)
    if (result.conflicts.length) return clashOut(result)
    if (!result.landed) return 'Nothing to land: your view has no changes.'
    return landedOut(result) + (await moveOn(deps, orrin, session, view))
  },
})
