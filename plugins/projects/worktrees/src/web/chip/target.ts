import type { WorktreeState } from '../../contract'
import type { DraftTarget, Thread } from '@sand/web-client/contract'
import type { WebContext } from '../client'
import type { States } from '../states'
import type { Choice, Choices } from './choices'

export interface ChipTarget {
  thread?: Thread
  draft?: DraftTarget
  cwd: string
  device?: string
  state?: WorktreeState | null
  choice: Choice
}

const started = (thread: Thread) => thread.info.messages > 0 || thread.entries.size > 0

export const chipTarget = (ctx: WebContext, states: States, choices: Choices): ChipTarget => {
  const current = ctx.threads.current()
  const thread = current && started(current) ? current : undefined
  const draft = current ? undefined : ctx.threads.drafting()
  const cwd = current?.info.cwd ?? draft?.cwd ?? ''
  const device = current ? current.device : draft?.device
  return { thread, draft, cwd, device, state: current && !thread ? null : states.get(cwd, device), choice: choices.of(draft?.id) }
}

export const mainBranch = (state: WorktreeState) => state.worktrees.find(entry => entry.main)?.branch ?? state.branch

export const chipLabel = ({ state, choice, thread }: ChipTarget) => {
  if (!state) return { text: '', glyph: 'folder', branch: null }
  if (state.worktree) return { text: state.branch ?? 'Worktree', glyph: 'folder-git', branch: null }
  if (thread || choice.mode === 'local') return { text: 'Local', glyph: 'folder', branch: state.branch }
  if (choice.mode === 'new') return { text: 'New worktree', glyph: 'folder-git', branch: choice.base ?? state.branch }
  return { text: choice.branch ?? 'Worktree', glyph: 'folder-git', branch: null }
}
