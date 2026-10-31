import type { Sessions } from '@sand/chats/contract'
import { type GitHub, type PullRef, pullLabel } from '@sand/github/contract'
import type { Loop } from '@sand/loop/contract'
import type { PullLinks } from '@sand/pull-links/contract'
import { reviewPrompt } from './prompt'

export interface AgentReviewDeps {
  github: GitHub
  pullLinks(): PullLinks | undefined
  sessions(): Sessions | undefined
  loop(): Loop | undefined
  report(error: unknown): void
}

export interface AgentReviewRequest extends PullRef {
  cwd: string
}

const needed = <T>(found: T | undefined, plugin: string): T => {
  if (!found) throw new Error(`Reviewing with the agent needs the ${plugin} plugin, which is turned off.`)
  return found
}

export const startAgentReview = async (deps: AgentReviewDeps, { cwd, ...ref }: AgentReviewRequest) => {
  const links = needed(deps.pullLinks(), 'Thread pull requests')
  const sessions = needed(deps.sessions(), 'Chat store')
  const loop = needed(deps.loop(), 'Agent loop')
  const pull = await deps.github.summary(ref, true)
  const { session } = await links.open({ cwd, ref: pullLabel(ref), mode: 'worktree' })
  loop.run(sessions.require(session), reviewPrompt(pull)).catch(deps.report)
  return { session }
}
