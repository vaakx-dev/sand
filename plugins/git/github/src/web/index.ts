import { wire } from '@sand/devices-contract'
import { folderFacts, threadRows } from '@sand/threads-home/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { dynamicChild } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { githubPulls } from '../contract'
import { pullsView } from './pulls'

export default definePlugin({
  name: 'github-web',
  description: "Shows the pull requests of each thread's branch on its row",
  inject: { wire, threads, kit },
  apply(ctx) {
    const pulls = folderFacts(ctx, ctx.threads, ({ cwd, device }) => ctx.wire.call(githubPulls, { cwd }, device))
    ctx.watch(threadRows, rows =>
      rows?.part({
        id: 'pulls',
        order: 20,
        render: thread =>
          dynamicChild(
            () => pulls.get(thread) ?? [],
            found => pullsView(ctx.kit, found),
          ),
      }),
    )
  },
})
