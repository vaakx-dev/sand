import { wire } from '@sand/devices-contract'
import { folderFacts, threadRows } from '@sand/threads-home/contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { githubPulls } from '../contract'

export default definePlugin({
  name: 'github-web',
  description: "Shows the pull requests of each thread's branch on its row",
  inject: { wire, threads },
  apply(ctx) {
    const pulls = folderFacts(ctx, ctx.threads, ({ cwd, device }) => ctx.wire.call(githubPulls, { cwd }, device))
    ctx.watch(threadRows, rows =>
      rows?.part({
        id: 'pulls',
        order: 20,
        render: thread => () => (pulls.get(thread) ?? []).map(pull => `#${pull.number}`).join(' '),
      }),
    )
  },
})
