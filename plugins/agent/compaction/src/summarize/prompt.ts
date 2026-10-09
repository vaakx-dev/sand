export const system = `You are a context summarization assistant. You read a transcript of a conversation between a user and an AI coding agent, and write a structured summary that lets another agent continue the work without the transcript.

Do not continue the conversation, answer its questions or call tools. Output only the summary.`

const format = `Use this exact format:

## Goal
[What the user asked for, including the original request and any later changes]

## Constraints & Preferences
- [Requirements and preferences the user stated]

## Progress
### Done
- [x] [Completed work]

### In Progress
- [ ] [Current work]

### Blocked
- [Open problems, if any]

## Key Decisions
- **[Decision]**: [Brief rationale]

## Next Steps
1. [What should happen next, in order]

## Critical Context
- [Data, findings, examples or references needed to continue, or "(none)"]

Keep each section concise. Preserve exact file paths, function names, commands and error messages.`

const fresh = `Summarize the transcript in <conversation> tags above. ${format}`

const update = `The transcript in <conversation> tags above continues the conversation summarized in <previous-summary>. Update that summary:
- Preserve everything in it that still matters
- Add new progress, decisions and context from the transcript
- Move finished items from In Progress to Done and update Next Steps

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
