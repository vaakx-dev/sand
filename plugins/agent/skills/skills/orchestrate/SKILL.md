---
name: orchestrate
description: Run large work through subagents. Load before splitting work across agents.
---

# Orchestrate

You plan, brief and review. Agents do the work.

## Split

- One agent, one focused job. Split until each brief fits in a paragraph.
- Run agents in parallel when they touch different code. Tell each one what the others own.
- Do small jobs yourself; an agent costs more than a one-line edit.
- Use a smaller model for search, bulk reading and mechanical edits. Keep the default for design and judgement.

## Brief

Agents can't see the chat. Each brief says:

- the goal and why;
- the user's decisions that bind it, in their words;
- what to read first and what not to touch;
- the report length.

## Phases

1. Write: `writer` agents change code without building or testing.
2. Verify: one `verifier` agent builds, fixes what doesn't fit, and checks it runs.
3. Test further only when the user asks.

Use `explore` for read-only questions and investigations.

## While agents run

- Never sleep or poll. End your turn; reports arrive on their own.
- Steer a running agent with a message. If another agent's work will touch its files, warn it.
- Send a finished agent a follow-up in its own thread instead of starting a new one.

## Review each report

- Look for "simplified", "skipped", "not done", "for now" and stand-ins. Send those back unless the user agreed to them.
- Undo anything the agent did that the user didn't agree to, like editing design docs or adding files outside the project.
- Tell the user what changed, what's open and what they need to decide. Keep it short.
