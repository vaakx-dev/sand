import type { GitAction, GitActionFailure } from '@sand/git-actions/contract'
import type { ToastAction } from '@sand/toasts/contract'
import { type AgentPrompt, conflictPrompt, dirtyPrompt, hookPrompt, rejectedPrompt } from '../agent/prompts'

export interface FailureNote {
  detail?: string
  actions: ToastAction[]
}

export interface StepHelpers {
  action: GitAction
  pc: string
  upstream: string
  retry(): void
  pullThenPush(): void
  ask?: (prompt: AgentPrompt) => void
}

const askStep = (helpers: StepHelpers, label: string, prompt: AgentPrompt, primary = true): ToastAction[] => {
  const { ask } = helpers
  return ask ? [{ label, primary, run: () => ask(prompt) }] : []
}

const authDetail = (pc: string) =>
  `Git on ${pc} isn't signed in to the remote. Sign in on that PC (for GitHub, run "gh auth login" or add an SSH key), then try again.`

export const failureSteps = (failure: GitActionFailure, helpers: StepHelpers): FailureNote => {
  const { action } = helpers
  const { output } = failure
  const retry: ToastAction = { label: 'Try again', primary: true, run: helpers.retry }
  switch (failure.reason) {
    case 'hook':
      return { detail: 'Nothing was committed.', actions: askStep(helpers, 'Ask the agent to fix', hookPrompt(output)) }
    case 'rejected':
      return {
        detail: `${helpers.upstream} has commits you don't have.`,
        actions: [{ label: 'Pull, then push', primary: true, run: helpers.pullThenPush }, ...askStep(helpers, 'Ask the agent', rejectedPrompt(helpers.upstream), false)],
      }
    case 'dirty':
      return { actions: askStep(helpers, 'Ask the agent', dirtyPrompt(action, failure.message, output)) }
    case 'conflict':
      return { actions: askStep(helpers, 'Ask the agent', conflictPrompt(action, output)) }
    case 'auth':
      return { detail: authDetail(helpers.pc), actions: [retry] }
    case 'locked':
      return { detail: 'Another git command is using this repo.', actions: [retry] }
    default:
      return { actions: [] }
  }
}
