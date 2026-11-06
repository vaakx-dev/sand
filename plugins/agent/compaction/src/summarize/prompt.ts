export const system = `You summarize a conversation between a user and an AI assistant so the assistant can carry on without it. It can be about anything: code, research, planning, writing or everyday chat.

The summary is the assistant's short-term memory: what it is working on now. Keep what the current work needs and drop work that is finished or stale. Long-term facts belong in a separate memory, not here.

Don't continue the conversation, answer it or call tools. Output only the summary.`

const format = `Use these sections in this order. Leave out any section with nothing in it; don't write "none".

## Goal
[What the user wants now, including later changes to the request. For open-ended chat, what it's about now]

## Working on
- [The task in hand and how far it got]

## User
- [Preferences, requirements, style and tone that shape the current work]

## Decisions
- [What was settled that the current work still depends on], because [reason]

## Open
- [Questions still being discussed, unsolved problems and blockers]

## Commitments
- [What the assistant promised and hasn't done yet, and reminders the user asked for, with any dates and times]

## Next steps
1. [What should happen next, in order]

## Context
- [Findings, data, sources and references the current work needs]

Leave out finished work. If later work needs a result of it, like a link, a number or a file path, keep just that result under Context. Leave out goals and topics the user dropped or moved on from.

Keep each section short. Keep exact details: names, dates, numbers, links and quotes that matter, and for technical work, file paths, function names, commands and error messages.`

const fresh = `Summarize the transcript in <conversation> tags above. ${format}`

const update = `The transcript in <conversation> tags above continues the conversation summarized in <previous-summary>. Update that summary:
- Keep what the current work still needs
- Add what's new in the transcript
- Drop work that is now finished, decisions nothing depends on any more, kept commitments and anything the user moved on from
- Update Working on and Next steps

${format}`

const inContext = `Stop here. Summarize this conversation so it can carry on from the summary alone. If it starts with an earlier summary, keep only what the current work still needs. Leave out your system prompt; it stays in place.

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
