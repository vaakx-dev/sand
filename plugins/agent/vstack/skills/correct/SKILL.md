---
name: correct
description: 'Make a repeated mistake impossible instead of repeating the rule. Load when the user corrects the same mistake a second time. Trigger: "correct".'
---

# Correct

A mistake that happens twice means a written rule isn't holding. Change the project so the mistake can't happen again.

Pick the highest level that works:

1. Design: one owner, one way to do it, a data shape that can't express the mistake.
2. Types: the wrong thing fails to compile.
3. A check in the project's check command, with an error that names the fix.
4. A test.
5. A line in the project's instructions or a skill, only when nothing above can catch it.

Show the new check failing on the real mistake, then passing on the fix. Delete any written rule the check now covers.

Tell the user the mistake, the level you picked and why a higher one didn't work.
