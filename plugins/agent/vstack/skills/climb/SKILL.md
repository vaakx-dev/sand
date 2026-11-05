---
name: climb
description: 'Improve something in rounds against a score until it reaches a target, like speed, size, test pass rate, an eval or design quality. Trigger: "climb", "hill climb".'
---

# Climb

Change, score, keep or revert, repeat.

## Before the first round

- Settle the score, the target and the round limit (default 5). If the user didn't give them, propose them and ask.
- Prefer a score a program gives: a test count, a benchmark, an eval, a size. Write the scorer first if none exists. Use a council only when the score is a judgement, like design.
- Write down what must not get worse, like tests, behavior and other metrics. These are the guards.
- Score the starting point as round 0.
- Work on its own branch or worktree.

## Each round

1. Make the changes most likely to move the score.
2. Run the guards, then score.
3. Better: commit. Worse or a guard broke: revert and try something else.

Never change the scorer or the guards to raise the score.

For a judged score, load the council skill. Score the reference products every round too. A gain counts only when it's bigger than how much the references moved, since their screenshots didn't change.

## Two goals

Reach the first, commit it, then climb the second while the first stays a guard. For example: pass every eval case, then cut the prompt size while every case still passes.

## Stop

- Target met: stop and show the user. Never raise the target on your own.
- No gain for 2 rounds, or the round limit: stop and report what's blocking.
- A timeout, an error or running out of budget is not a pass.

## Report

A table of scores by round, what changed each round, what you reverted, and any taste calls you need from the user.
