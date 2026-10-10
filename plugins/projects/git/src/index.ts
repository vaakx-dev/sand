import { definePlugin } from 'drydock'
import { branch, branches } from './branch'
import { readStatus } from './status/read'

export default definePlugin({
  name: 'git',
  description: 'Answers git questions about a project folder for the page: the current branch, changed files and unpushed commits',
  uses: { server: 'does nothing' },
  apply(ctx) {
    ctx.watch('server', server =>
      server?.handle({
        'git.branch': ({ cwd }) => branch(cwd),
        'git.branches': ({ cwds }) => branches(cwds),
        'git.status': ({ cwd }) => readStatus(cwd),
      }),
    )
  },
})
