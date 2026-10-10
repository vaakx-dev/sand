---
name: clean-code
description: Write focused, readable code. Use when writing or changing code.
---

# Clean code

Write the least code that does the job, in a shape the next reader can follow.

## Scope

- Every changed line traces to the task.
- Follow the project's instructions first, then this skill.
- Copy the patterns of nearby code only where they meet these rules.
- When asked to clean up, rewrite the code to these rules.
- Reuse what exists before adding a helper.
- Remove what your change made unused. Leave other cleanup for its own change unless asked.

## Structure

- Organise by feature. A feature gets a folder once it has a few files, and subfolders as it grows.
- Keep the root and each folder small.
- One job per file and per function. Split when a name needs "and".
- Read top to bottom: helpers first, then the export that uses them.
- Return early to keep nesting shallow.

## Names

- Name things for what they are in the domain.
- If no honest name fits, the design is unclear. Fix the design first.

## Leave out

- Comments. Rename or split the code instead.
- Error handling for cases that can't happen, and catches that only rethrow or quietly fall back.
- Abstractions with one caller, wrappers that only pass calls through, options nobody sets.
- Dead code, unused parameters, logs, vague TODOs, and compatibility code for things you're replacing.
- `any`, casts that silence the compiler, nested ternaries and clever one-liners.

## Before you finish

Reread the diff. If it could be much shorter, rewrite it. For each new function, file or layer, imagine deleting it. If nothing gets harder, delete it.
