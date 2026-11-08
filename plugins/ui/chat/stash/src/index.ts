import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { stashAdd, stashChange, stashList, stashRemove } from './contract'
import { createStore } from './store'

export default definePlugin({
  name: 'stash',
  description: 'Messages set aside for later',
  inject: { paths },
  async apply(ctx) {
    const store = await createStore(join(ctx.paths.home, 'stash.json'), entries => ctx.get(server)?.broadcast(stashChange, entries))
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.handle(stashList, () => store.list()),
            found.handle(stashAdd, stashed => store.add(stashed)),
            found.handle(stashRemove, ({ id }) => store.remove(id)),
          )
        : undefined,
    )
  },
})
