export const system = `You summarize a transcript between a user and a coding agent so another agent can continue without it.

Don't continue the conversation, answer it or call tools. Output only the summary.`

const format = `Use this exact format:

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

const fresh = `Summarize the transcript in <conversation> tags above. ${format}`

const update = `The transcript in <conversation> tags above continues the conversation summarized in <previous-summary>. Update that summary:
- Keep everything in it that still matters
- Add new progress, decisions and context from the transcript
- Move finished items from In progress to Done and update Next steps

${format}`

export const promptText = (conversation: string, previous?: string, instructions?: string) =>
  [
    `<conversation>\n${conversation}\n</conversation>`,
    previous && `<previous-summary>\n${previous}\n</previous-summary>`,
    previous ? update : fresh,
    instructions && `Additional focus: ${instructions}`,
  ]
    .filter(Boolean)
    .join('\n\n')
