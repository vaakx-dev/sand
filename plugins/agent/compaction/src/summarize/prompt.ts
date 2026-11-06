export const system = `You summarize a conversation between a user and an AI assistant so the assistant can carry on without it. It can be about anything: code, research, planning, writing or everyday chat.

Don't continue the conversation, answer it or call tools. Output only the summary.`

const format = `Use these sections in this order. Leave out any section with nothing in it; don't write "none".

## Goal
[What the user wants, including the original request and later changes. For open-ended chat, what it's about]

## User
- [Preferences, requirements, and the style and tone the user wants]
- [Facts the user shared, and the people, names and relationships they mentioned]

## Progress
### Done
- [x] [Finished work]

### In progress
- [ ] [Current work]

## Decisions
- [What was settled], because [reason]

## Open
- [Questions still being discussed, unsolved problems and blockers]

## Commitments
- [What the assistant promised to do or check on, and reminders the user asked for, with any dates and times]

## Next steps
1. [What should happen next, in order]

## Context
- [Findings, data, sources and references needed to carry on]

Keep each section short. Keep exact details: names, dates, numbers, links and quotes that matter, and for technical work, file paths, function names, commands and error messages.`

const fresh = `Summarize the transcript in <conversation> tags above. ${format}`

const update = `The transcript in <conversation> tags above continues the conversation summarized in <previous-summary>. Update that summary:
- Keep everything in it that still matters, and drop what no longer does
- Add what's new in the transcript
- Move finished work to Done and settled questions to Decisions
- Remove commitments that were kept, and update Next steps

${format}`

const inContext = `Stop here. Summarize this conversation so it can carry on from the summary alone. If it starts with an earlier summary, keep everything in it that still matters. Leave out your system prompt; it stays in place.

Don't continue the conversation, answer it or call tools. Output only the summary.

${format}`

const focus = (instructions?: string) => instructions && `Additional focus: ${instructions}`

export const inContextText = (instructions?: string) => [inContext, focus(instructions)].filter(Boolean).join('\n\n')

export const promptText = (conversation: string, previous?: string, instructions?: string) =>
  [
    `<conversation>\n${conversation}\n</conversation>`,
    previous && `<previous-summary>\n${previous}\n</previous-summary>`,
    previous ? update : fresh,
    focus(instructions),
  ]
    .filter(Boolean)
    .join('\n\n')
