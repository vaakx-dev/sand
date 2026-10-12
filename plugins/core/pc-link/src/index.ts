import { watchRemotes } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { createConnections } from './connections'
import type { Pcs } from './contract'
import { createProjectLookup } from './projects'
import { createThreadLookup } from './threads'

export default definePlugin({
  name: 'pc-link',
  description: 'Sends wire requests from the runtime to this PC and to paired PCs, over one kept-open connection per PC, and finds threads and projects on them',
  inject: ['cli'],
  apply(ctx) {
    const { home } = ctx.cli
    const connections = createConnections(home)
    ctx.effect(() => connections.close)
    ctx.effect(() => watchRemotes(home, connections.forget))
    const { here, list, find, call, fetch } = connections
    const pcs: Pcs = { here, list, find, call, fetch, ...createThreadLookup(connections), ...createProjectLookup(connections) }
    ctx.provide('pcs', pcs)
  },
})
