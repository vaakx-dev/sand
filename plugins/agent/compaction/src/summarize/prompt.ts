import type { CompactionBrief } from '../contract'

const noReply = "Don't continue the conversation, answer it or call tools."

export const system = `You summarize a transcript between a user and a coding agent so another agent can continue without it.

${noReply}`

const format = `Output only the summary. If there is an earlier summary, update it:
- Keep everything in it that still matters
- Add new progress, decisions and context
- Move finished items from In progress to Done and update Next steps

Use this exact format:

## Goal
[What the user asked for, including the original request and any later changes]

## Constraints
- [Requirements and preferences the user stated]

## Progress
### Done
- [x] [Finished work]

### In progress
- [ ] [Current work]

### Blocked
- [Open problems, if any]

## Decisions
- [Decision], because [reason]

## Next steps
1. [What should happen next, in order]

## Context
- [Data, findings, examples or references needed to continue, or "(none)"]

Keep each section short. Keep exact file paths, function names, commands and error messages.`

export const summaryBrief: CompactionBrief = {
  format: async () => format,
  accept: async reply => reply,
}

const fresh = 'Summarize the transcript in <conversation> tags above.'

const update = 'The transcript in <conversation> tags above continues the conversation summarized in <previous-summary>. Update that summary with it.'

const inContext = `Stop the work here. Summarize this conversation so another agent can continue it without seeing it. Leave out your system prompt; the next agent gets it too.

${noReply}`

const focus = (instructions?: string) => instructions && `Additional focus: ${instructions}`

export const inContextText = (format: string, instructions?: string) => [inContext, format, focus(instructions)].filter(Boolean).join('\n\n')

export const promptText = (format: string, conversation: string, previous?: string, instructions?: string) =>
  [
    `<conversation>\n${conversation}\n</conversation>`,
    previous && `<previous-summary>\n${previous}\n</previous-summary>`,
    previous ? update : fresh,
    format,
    focus(instructions),
  ]
    .filter(Boolean)
    .join('\n\n')
