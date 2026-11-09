---
name: council
description: 'Get a review or a score from several models from different providers at once. Trigger: "council".'
---

# Council

Ask several models the same question, each on its own, and act where they agree.

## Seats

- List the models. Give each seat a different lab where you can. Models from one lab agree too easily.
- Mind cost:
  - Lean on models the user already pays for through a subscription.
  - Seat a model with a small allowance only in the final round.
  - For pay-per-token models, pick cheap ones, around $1 per million output tokens or less.
- Default panel: the strongest model the user's subscription covers, plus two cheap models from other labs.
- Use the user's picks when they name them. If a seat can't run, say so. Never swap in another model silently.

## Brief

- Start each reviewer as an agent told to read only and change nothing, all in one message so they run in parallel.
- Give every reviewer the same brief: the request, what to read, the categories and a 1 to 10 scale.
- Never tell reviewers the target score, earlier scores or what other reviewers said.
- When comparing versions, label them A, B, C in a new random order each round, and don't say which one is ours.
- Ask for a score per category, an overall score, and fixes ranked by impact, each with an id.
- Every round starts new reviewers. A reviewer that saw the last round anchors on its own score.

## Screenshots

- Take them fresh each round, at real size, in every theme the app has.
- Add the reference products the user named, as the bar to beat.
- Leave out reviewers that can't read images for that round.

## After a round

- Check each finding yourself. Make the fixes you agree with. Decline the rest in one line with a reason.
- Fight scope creep. The user's taste calls stand even when reviewers object.
- Report each reviewer's scores, where they agree and disagree, and what you'd do next.
- In a PR, put the scores in a table in the description: one row per reviewer, one column per round. Write "not run" or "no score"; never make one up.
