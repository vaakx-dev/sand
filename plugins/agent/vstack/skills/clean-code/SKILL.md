---
name: clean-code
description: Write focused, readable code. Must be loaded before writing or changing any code, in every agent.
---

# Clean code

Code reads like a list of named steps. Every step, value and rule has a name, so the code explains itself and never needs a comment. Control flow stays flat. Old code is deleted, not kept beside the new.

## What matters most

These come before every other rule in this skill.

- **Less is more.** The best change leaves less code and fewer concepts than the obvious one: no duplication, and no layers, options or cases that don't earn their place. A name for a step is not extra code.
- **No duplication.** When two pieces of code do the same thing, merge them into one, including code that was there before you.
- **Build for the future.** Make the change you would want to find a year from now, not the one that is quickest today. Each change should look as if it had been the design from the start, so rework the code around it.
- **Only the best change.** If you see a better design than the one you were about to write, write the better one, even when it takes more code or new modules. Build everything the best change needs and nothing it doesn't: no kinds, formats, options or behaviour the request didn't ask for.
- **Better and faster each time.** Leave the code you touch cleaner and faster than you found it.
- **No hacks and no quick fixes.** No special cases, guards or flags that hide a problem instead of fixing its cause.
- **Never bolt one system onto another.** If two systems don't fit, change their shapes until they do. No adapters, shims or glue code that only exist to make them talk.
- **Replace, don't add.** When new code does what old code did, move every caller to the new code and delete the old system in the same change.
- **These rules beat the code around them.** Never copy a pattern from existing code that breaks these rules. When your change touches code that breaks them, rewrite that code to meet them in the same change.
- **No bad tests.** Load the verify skill before writing or changing a test, and delete the bad tests you find.

## Scope

- Read the code you need before changing it. Follow the project's instructions first, then this skill.
- A bug your change causes or exposes is part of the task. Fix it in the same change, the simplest correct way.
- When you replace code, replace its bad behaviour with the correct behaviour. Don't carry a known flaw across.
- A bug unrelated to the task is not yours to fix silently. Report it and offer the fix.
- When asked to clean up, rewrite the code to these rules.

## Names explain the code

No comments. Not doc comments, not "why" comments, not TODOs, not step labels. If code needs a comment, rename or extract until it doesn't. The one exception is a comment a tool requires to work.

Name every step. A function body is a short list of calls to named steps, each one level down.

No:

```ts
export async function publish(draft: Draft, user: User) {
  if (!draft.title.trim()) return { error: 'Title is empty' }
  if (!user.verified) return { error: 'Verify your email first' }
  const slug = draft.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  // ...20 more lines of slug, insert and mail
}
```

Yes:

```ts
export async function publish(draft: Draft, user: User) {
  const error = problem(draft, user)
  if (error) return { error }
  const post = { ...draft, slug: await slugFor(draft.title), author: user.id }
  await db.posts.insert(post)
  await notifyFollowers(post)
  return { post }
}
```

- Split a function into named steps even when it is short. A step that takes a line of thought to read gets a name.
- Name steps by extracting code that is already there. Never add a module, type or class just to give something a name.
- Give intermediate values names instead of one long expression.
- Wrap raw calls in a function named for the domain: `thread(id)`, not `api.get(\`/threads/${id}\`)` at each call site. A wrapper that only forwards a call is fine when it names what the caller means.
- Give an object a method for what callers need instead of letting them reach through its fields: `session.thread(id)`, not `session.store.thread(id)`.
- Name numbers that carry meaning (`MAX_RETRIES`, `SEAT_LIMITS`). Leave values whose meaning is obvious in place: `0`, `1`, `/ 100` for cents.
- Constants are `SCREAMING_SNAKE_CASE`.

## Names carry meaning, never context

The folder, module, type or receiver already says where a name lives. Don't repeat it.

| No | Yes |
|---|---|
| `enemies/enemy_body.ts`, `class EnemyBody` | `enemy/body.ts`, `class Body` |
| `user.userName` | `user.name` |
| `IUser`, `UserService`, `UserManager`, `UserHelper` | `User`, `Directory`, or what the thing really is |
| `getUser()`, `handleClick()` | `user()`, `save()` / `open()`: the action it takes |
| `isActive`, `isValid()` | `active`, `valid()` |
| `const userRepository = ...` | `const repository = ...` |
| `utils/`, `helpers/`, `common/`, `shared/`, `misc/` | a module named for its subject: `duration.ts`, `clock.rs` |

- Use full words. No abbreviations, and no single letters, even in short loops and closures: `orders.map(order => order.total)`.
- Keep units in the name, because a unit is meaning, not context: `timeoutMs`, `delaySecs`.
- Name traits as `-able` adjectives: `Drawable`, `Spawnable`.
- When two imports share a name, alias at the import (`import { Body as EnemyBody }`) instead of prefixing the export.
- If no honest name fits, the design is unclear. Fix the design first.

## Flat control flow

- Guard clauses and early returns. Never put `else` after a `return`.
- Several checks in a row stay flat, one condition each. Never nest one inside another.
- Rust: chain fallible steps with `?` and `map_err`. Use `let-else` for two or more `Option` guards in a row. For a single `Option` with two outcomes, use `match` with both arms, even when one arm is empty.
- Rust: put guards on flat `match` arms, and match on a tuple instead of nesting matches.
- Short checks are one expression: `?.` and `??` in TS, `is_some_and` and `find` in Rust.
- Use iterator pipelines (`filter`, `map`, `find`, `reduce`, `sum`) over loops with `continue`, and name the steps when the chain is long.
- Use a ternary for a two-way value. Never nest ternaries; use guard clauses or a `switch`.
- To leave nested loops, use a labeled `break`, not a flag variable.
- Keep `try` around only the call that throws.

Branching on a fixed set of cases:

- A pure value per case goes in a lookup table: `const SEAT_LIMITS: Record<Tier, number> = { ... }`.
- Code per case goes in a `switch` or `match` with one `return` per case. Not a table of handler functions.

## Functions and data

- No boolean parameters. Write two functions, or take an enum or union with named cases: `remove(path, Depth::Tree)`, not `remove(path, true)`.
- More than two or three arguments go into an options object (TS) or a config struct (Rust). Use builders for Rust structs with many optional fields.
- Destructure parameters in TS.
- Use a discriminated union or enum for a value with a fixed set of shapes, not optional fields and flags. A fixed set of variants is an enum, not a trait with one struct each.
- Wrap ids and units in newtypes instead of raw `u64` or `string`.
- Return a `Result` for failures, in both TS and Rust. Don't throw or panic for errors a caller can meet.
- A thing that holds state is a class (TS) or a struct with methods (Rust). Stateless logic is plain functions in a module, never a class of static methods.
- TS: return new values instead of mutating inputs. Rust: `&mut self` methods are fine.
- TS: use `function` declarations, `interface` for object shapes, `async/await`, and type inference except at exported signatures.
- Each piece of state has one owner. Derive values instead of syncing copies. A second flag that must match the first means the shape is wrong.
- Check outside input once, where it comes in. Past that point, trust the types.
- Catch an error only where you can do something real with it.

## Fast by design

- Do the least work: pick the data structure and algorithm that fit how the data is used. A lookup in a loop is a `Map` or `Set`, not a scan.
- Do each piece of work once. No repeated reads, parses or queries for the same data, and no calls in a loop that one batched call could make.
- Run independent async work together and dependent work in order. Never run in parallel what must happen in order, like key presses or writes to one stream.
- Don't wait when nothing needs waiting: no polling, sleeps or timeouts where an event, a direct call or synchronous code fits.
- Stream or page large data instead of loading it all. Free what you open.
- Speed comes from the design, never from tricks that hurt reading. Measure before tuning hot code by hand.

## Files and folders

- Group code by responsibility: what it does as a unit. In an app that is a product feature (`chat/`, `contacts/`, `settings/`). In an engine or tool it is a system (`physics/`, `render/`, `engine/`, `term/`). Never group by technical role: no `components/`, `services/`, `models/`, `data/`, `api/`, `screens/`.
- Folder names are singular: `enemy/`, `weapon/`.
- File names are lowercase and named for their one subject: `body.ts`, `spawn.ts`. Rust module roots are `mod.rs` inside the folder.
- One job per file and per function. A feature becomes a folder once it has a few files.
- Rust: one module per file, a `lib.rs` with a thin `main.rs`.
- A TS folder that others import from has an `index.ts` that only re-exports. Its code lives in named files.
- Code used by two or more modules moves into its own module named for its subject. Never copy it, and never put it in a catch-all module.
- Types live in the module that owns them, not in a central `types` file.
- Tests live in a separate `test/` (TS) or `tests/` (Rust) folder, not beside the code or inline.
- Inside a file, group declarations by kind: types, then constants, then functions. Helpers come first, above the function that uses them, so the file reads top to bottom.
- TS: write one `export { ... }` list at the end of the file, not `export` on each declaration.

## Keep it current

- Keep one way to do each thing. When you add a new way, move every caller and delete the old one in the same change. No deprecated aliases, compat branches or feature flags left after a rollout.
- After a rename, search strings and docs too.
- Delete dead code, unused parameters, logs and anything your change left behind.
- Never use `any`, casts that silence the compiler, or suppressions like `@ts-ignore`, `eslint-disable` and `#[allow]`. Fix the cause.

## Before you finish

Reread the diff and ask:

- Could it be less code? If 200 lines could be 50, rewrite it.
- Does anything now do the same job twice? Merge it.
- Is any part a hack, a quick fix or glue between systems that don't fit? Redo it properly.
- For each new system, file or layer: if you deleted it, would anything get worse? If not, delete it.
- Is the old code it replaces fully gone, with every caller moved?
- Does the code it touches meet these rules, or did it copy the old style?
- Does it do any work twice, wait for nothing, or scan where it could look up?
- Does each function read as a few named steps, with names that make sense without a comment?
