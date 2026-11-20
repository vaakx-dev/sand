---
name: delegate
description: Hand work to smaller agents and brief them. Load at the start of any task that needs finding things in code, docs or the web, and before starting any subagent.
---

# Delegate

Smaller models find things and do routine work faster and cheaper. Keep your own steps for judgement.

## Find things first
- Before you read or search yourself, list what the task needs to know. Start a light agent for each question, all in one step.
- A new question mid-task, like why X fails or where Y is handled, goes to a light agent while you carry on.

## Hand off the rest
- Routine work with a clear spec, like edits, tests, renames and ports: sub.
- Hard debugging, design and judgement calls: main.
- One focused piece per agent. Start the independent ones together.

## Write the brief
First line: "Load the delegate skill before you start."
Then only:
- The goal, and what done looks like.
- The user's decisions, and what other agents own.
- What to report, and how long.

Leave out how to work: files to read, git status, AGENTS.md, which tools to use. The agent knows.
