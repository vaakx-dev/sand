import type {} from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { serveStash } from './serve'
import { createStore } from './store'

export default definePlugin({
  name: 'stash',
  description: 'Prompts saved from the composer for later, kept in the sand home folder and shared by every thread and device',
  inject: ['paths'],
  uses: {
    server: 'the page cannot list or save stashed prompts',
  },
  async apply(ctx) {
    const store = await createStore(ctx.paths.home)
    ctx.watch('server', server => (server ? serveStash(server, store) : undefined))
  },
})
