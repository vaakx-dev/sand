---
name: clean-code
description: Write focused, readable code. Load before writing or changing any code.
---

# Clean code

Less is more. Code is clean, readable, simple and fast, and the best choice for long-term maintenance and growth.

## Scope

- Make the smallest change that solves the task. No features, options or flexibility nobody asked for.
- Read the code you need before changing it.
- Every changed line traces to the task or to a bug you found. Leave other cleanup for its own change unless asked.
- Follow the project's instructions first, then this skill.
- Copy the patterns of nearby code only where they meet these rules.
- Reuse what exists before adding a helper.
- When asked to clean up, rewrite the code to these rules.

## Shape

- Pick the data shape before writing logic. When the data is right, the code is short.
- Build each change as if it had been the design from the start. Rework the code around it. Never patch on a quick fix that only solves today's problem.
- Choose the fast design by default: the right data structure, no repeated work, no needless copies or round trips.
- Each piece of state has one owner. Derive values instead of syncing copies, and return values instead of mutating shared state. A second flag that must match the first means the shape is wrong.
- Keep one way to do each thing. When you add a new way, move every caller to it and delete the old one in the same change. After a rename, search strings and docs too.
- Organise by feature. A feature gets a folder once it has a few files, and subfolders as it grows.
- Keep the root and each folder small.
- One job per file and per function. Split when a name needs "and".
- Read top to bottom: helpers first, then the export that uses them.
- Return early to keep nesting shallow.

## Errors and branches

- Check outside input once, where it comes in: user input, files, network, config. Past that point, trust the types. Make them rule out states that can't happen instead of guarding against them.
- Catch an error only where you can do something real with it. No try/catch around code that can't fail, no catch that logs and rethrows, no quiet fallback.
- When the same choice shows up in several ifs, or a value has a fixed set of cases, use one lookup table, union type or state machine instead of if chains.

## Names

- Name things for what they are in the domain.
- If no honest name fits, the design is unclear. Fix the design first.

## Leave out

- Comments, including suppressions like `@ts-ignore`, `eslint-disable` and `#[allow]`. Rename, split or fix the cause instead.
- Abstractions with one caller, wrappers that only pass calls through.
- Dead code and unused parameters, including any your change left behind.
- Logs, vague TODOs, and compatibility code for things you're replacing.
- `any`, casts that silence the compiler, nested ternaries and clever one-liners.

## Before you finish

Reread the diff. If 200 lines could be 50, rewrite it. For each new function, file or layer, imagine deleting it. If nothing gets harder, delete it.
