export const messages = {
  commit: '$commit',
  push: 'Push this branch',
  pr: '$file-pr',
  babysit: '$babysit-pr',
  babysitMerge: '$babysit-pr then merge',
  pull: 'Pull this branch',
  pullBase: (base: string) => `Pull from ${base}`,
  merge: (base: string) => `Squash merge the PR and pull ${base}`,
  switchTo: (branch: string) => `Switch to branch ${branch}`,
}
