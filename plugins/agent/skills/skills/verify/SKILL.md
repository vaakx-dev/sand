---
name: verify
description: Check that a change works by running it. Use before saying something works.
---

# Verify

Passing checks only shows the code builds. Run the changed thing the way a person would use it, and watch what happens.

1. Read the project's instructions for how to build, run and test it.
2. Run the checks and tests.
3. Run the change for real:
   - A command: run it with the inputs the change touches, including a bad one.
   - A server or API: start a throwaway instance on a free port and call it.
   - A UI: open it in a headless browser at desktop and phone sizes, click through the changed flow and take screenshots.
4. For a bug fix, show it failing on the base branch and working after.
5. For a big change, also give the task and the diff to a fresh subagent and ask it to break the change.
6. Stop anything you started.

Use throwaway data, homes and ports. Leave the user's running services alone.

Report what you ran and what you saw, with output or screenshots. Say what you couldn't run.
