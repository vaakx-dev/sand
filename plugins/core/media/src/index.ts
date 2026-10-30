import { type Sessions, sessions } from '@sand/chats/contract'
import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { type Media, media, mediaPath, mediaSign } from './contract'
import { type Providers, scheduleCollect } from './gc'
import { mediaRoute } from './route'
import { createSized } from './route/sized'
import { createSigner } from './sign'
import { loadKey } from './sign/key'
import { createTokens } from './sign/tokens'
import { createStore } from './store'

export default definePlugin({
  name: 'media',
  description: 'Keeps every image and document a chat uses in one store on disk, and serves them to the page through signed links',
  inject: { paths },
  apply(ctx) {
    const store = createStore(join(ctx.paths.home, 'media'))
    const tokens = createTokens(loadKey(join(store.folder, '.key')))
    const providers: Providers = new Set()
    let threads: Sessions | undefined
    ctx.watch(sessions, found => {
      threads = found
    })

    const service: Media = {
      put: store.put,
      path: store.path,
      data: store.data,
      inUse(hashes) {
        providers.add(hashes)
        return () => void providers.delete(hashes)
      },
    }
    ctx.provide(media, service)
    ctx.effect(() => scheduleCollect(store.folder, providers, error => ctx.report(error)))

    const route = mediaRoute(store, tokens, createSized(join(store.folder, 'sized')))
    const sign = createSigner(store, tokens, session => (session ? threads?.open(session)?.cwd : undefined))
    ctx.watch(server, found => (found ? joinDisposers(found.route(mediaPath, route, { public: true }), found.handle(mediaSign, sign)) : undefined))
  },
})
