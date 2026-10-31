import type { GitAction } from '@sand/git-actions/contract'

export interface AgentPrompt {
  label: string
  text: string
}

const stopOnConflicts = 'If there are conflicts, stop and ask me how to resolve them instead of guessing.'

const withOutput = (text: string, output?: string) => (output?.trim() ? `${text}\n\n\`\`\`\n${output.trim()}\n\`\`\`` : text)

export const catchUpPrompt = (base: string): AgentPrompt => ({
  label: `Catch up with ${base}`,
  text: `Fetch origin and rebase this branch onto origin/${base} so it has the latest ${base}. ${stopOnConflicts} Don't push.`,
})

export const rebasePrompt = (upstream: string): AgentPrompt => ({
  label: `Rebase onto ${upstream}`,
  text: `This branch and ${upstream} have diverged. Fetch and rebase the local commits onto ${upstream}. ${stopOnConflicts} Don't push.`,
})

export const hookPrompt = (output?: string): AgentPrompt => ({
  label: 'Fix the commit hook',
  text: withOutput("The pre-commit hook failed, so nothing was committed. Fix what it reports, then tell me so I can commit again. Don't commit yourself.", output),
})

export const conflictPrompt = (action: GitAction, output?: string): AgentPrompt => ({
  label: 'Resolve the conflicts',
  text: withOutput(`git ${action} stopped on conflicts. Show me which files conflict and how you'd resolve them, and wait for my go-ahead before changing anything.`, output),
})

export const dirtyPrompt = (action: GitAction, message: string, output?: string): AgentPrompt => ({
  label: `Unblock git ${action}`,
  text: withOutput(`git ${action} failed because of uncommitted changes: ${message}\nLook at what's uncommitted and tell me how to get it out of the way. Don't discard anything without asking.`, output),
})

export const rejectedPrompt = (upstream: string): AgentPrompt => ({
  label: 'Fix the rejected push',
  text: `My push was rejected because ${upstream} has commits I don't have. Fetch and rebase onto ${upstream}. ${stopOnConflicts} Don't push.`,
})
