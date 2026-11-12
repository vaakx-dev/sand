const summaryFormat = `If there is an earlier summary, update it:
- Keep what the current work still needs
- Add what's new
- Drop work that is now finished, decisions nothing depends on any more, kept commitments and anything the user moved on from
- Update Working on and Next steps

Use these sections in this order. Leave out any section with nothing in it; don't write "none".

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

export { summaryFormat }
