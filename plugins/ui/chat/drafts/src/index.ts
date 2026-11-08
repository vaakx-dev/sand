import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { draftsAll, draftsRead, draftsWrite } from './contract'
import { createStore } from './store'

export default definePlugin({
  name: 'drafts',
  description: "Keeps each chat's unsent message on the server",
  inject: { paths },
  async apply(ctx) {
    const store = await createStore(join(ctx.paths.home, 'drafts.json'))
    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.handle(draftsRead, ({ key }) => store.read(key)),
            found.handle(draftsAll, () => store.all()),
            found.handle(draftsWrite, ({ key, draft }) => store.write(key, draft)),
          )
        : undefined,
    )
  },
})
