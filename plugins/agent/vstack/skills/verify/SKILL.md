---
name: verify
description: Check that a change works by running it, and decide whether it earns a test. Load before fixing a bug, writing a test, or saying a change works.
---

# Verify

Prove the change works with the fewest runs that show it. Passing checks only show the code builds. One real run of the changed path shows it works.

## Check

1. Run the project's check command, as its instructions say.
2. Run the changed thing once, the way a person would use it:
   - A command: run it with the input the change touches.
   - A server or API: start a throwaway instance on a free port and call what changed.
   - A UI: open the changed screen and take a screenshot. Check phone size only when the layout changed.
3. Stop anything you started.

Match the effort to the change. A rename or a copy edit needs the check command and nothing more. Don't rerun what already passed, and don't check what reading the diff already proves.

Use throwaway data, homes and ports. Leave the user's running services alone.

## Bugs

- Reproduce it first, then show it fixed.
- Ask whether the broken state should exist. If it should, fix the code that broke on it. If it shouldn't, find what made it. A guard where it broke hides the bug.
- If two fixes fail, stop patching. Find the assumption both shared and test it.
- When the evidence rules out a guess, undo what the guess added.

## Tests

Where the project allows tests, write one only when it's strong. This holds when a brief, a plan or the user asks for tests too: if no test earns its place, say so instead of writing a weak one.

- It guards behavior someone relies on that could break quietly later, like a parser, a calculation, a state change, or a bug that came back once.
- It can fail. Take the expected value from what the code should do, not from running it.
- It would make sense if the code had always been this way. A test that only makes sense next to this diff is a checklist, not a test.
- It checks what a caller can see, so rewriting the internals leaves it passing.

Never write a test that:

- checks that something exists, was removed or is absent: a file, function, option, field or piece of text;
- checks a constant, color, string, prompt or setting has the value you just gave it;
- tests the language, the type checker, the build, a framework or a library instead of this code;
- works out its expected value with the same logic as the code;
- only checks that mocks were called, or tests a fake instead of the real code;
- reaches into internals, or needs something exported only for the test.

Before you finish, reread every test you added or changed against these rules and delete any that breaks one.

Never weaken an existing test to make your code pass, unless the intended behavior changed.

One test that covers a behavior beats many small ones. A script you ran once to check the change is not a test. Delete it.

## Report

Keep it to a line or two per check.
