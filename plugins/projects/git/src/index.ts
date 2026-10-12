import { definePlugin } from 'drydock'
import { branches } from './branch'
import { freshness } from './fresh/freshness'
import { readStatus } from './status/read'

export default definePlugin({
  name: 'git',
  description:
    'Answers git questions about a project folder for the page: the current branch, changed files, unpushed commits and how far it is behind main. It fetches origin at most every 5 minutes while the page asks, and tells the page when the repo changes',
  uses: {
    server: 'does nothing',
    watcher: 'commits, checkouts and pulls made outside sand show on the page only when it gets focus again or after a minute',
  },
  apply(ctx) {
    const keepFresh = freshness(ctx)
    ctx.watch('server', server =>
      server?.handle({
        'git.branches': ({ cwds }) => branches(cwds),
        'git.status': async ({ cwd }) => {
          const status = await readStatus(cwd)
          if (status) void keepFresh(cwd)
          return status
        },
      }),
    )
  },
})
