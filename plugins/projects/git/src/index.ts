import { definePlugin } from 'drydock'
import { branches } from './branch'
import { readStatus } from './status/read'

export default definePlugin({
  name: 'git',
  description:
    'Answers git questions about a project folder for the page: the current branch, changed files, unpushed commits and how far it is behind main. It fetches origin at most every 5 minutes while the page asks',
  uses: { server: 'does nothing' },
  apply(ctx) {
    ctx.watch('server', server =>
      server?.handle({
        'git.branches': ({ cwds }) => branches(cwds),
        'git.status': ({ cwd }) => readStatus(cwd),
      }),
    )
  },
})
