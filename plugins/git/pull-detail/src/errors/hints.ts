import type { PullRef } from '@sand/github/contract'

type Hint = [pattern: RegExp, why: (ref: PullRef) => string]

const hints: Hint[] = [
  [/protected branch/i, () => 'the branch is protected on GitHub.'],
  [/default branch/i, () => "it's the repository's default branch."],
  [/resource not accessible by/i, () => "this PC's GitHub sign-in isn't allowed to do that; sign in to GitHub again with more access."],
  [/review(s)? cannot be requested from (the )?pull request author/i, () => "a pull request's author can't be asked to review it."],
  [/collaborator/i, ({ repo }) => `reviews can only be asked of people with access to ${repo}.`],
  [/expected head|head (ref|branch|sha).*(changed|modified|moved|match)/i, () => 'someone pushed to the branch meanwhile; refresh and try again.'],
  [/conflict/i, () => 'the branch has conflicts that need resolving first.'],
  [/locked/i, () => 'the conversation is locked, so only collaborators can comment.'],
  [/no new commits|already up.to.date/i, () => 'the branch is already up to date.'],
  [/permission|must have (admin|push|write)|not authorized|forbidden/i, ({ repo }) => `your GitHub account doesn't have permission to do that in ${repo}.`],
]

export const hintFor = (said: string, ref: PullRef) => hints.find(([pattern]) => pattern.test(said))?.[1](ref)
