import { definePlugin } from 'drydock'
import { createBranches } from './branches'
import { forgetWhenStale } from './stale'
import { createGitStatus } from './status'

export default definePlugin({
  name: 'git-branches',
  description: 'Looks up the git branch and status of thread folders for the page, and looks again when the repo changes or the page comes back into view',
  inject: ['wire'],
  apply(ctx) {
    const branches = createBranches(ctx)
    const statuses = createGitStatus(ctx)
    forgetWhenStale(ctx, () => {
      branches.forget()
      statuses.forget()
    })
    ctx.provide('branches', { of: branches.of })
    ctx.provide('gitStatus', { of: statuses.of, refresh: (cwd, device) => void statuses.refresh(cwd, device) })
  },
})
