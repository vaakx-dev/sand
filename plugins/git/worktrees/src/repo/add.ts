import type { GitRunner } from '@sand/git-runner/contract'
import { longGitMs } from './timeout'

const parallelCheckout = ['-c', 'checkout.workers=0']

export const addWorktree = (git: GitRunner, main: string, args: string[], what: string) =>
  git.ok(main, [...parallelCheckout, 'worktree', 'add', ...args], { timeoutMs: longGitMs, what })
