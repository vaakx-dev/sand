import { pcs, wire } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { gitStatusClient } from '../contract'
import { createStatusClient } from './client'
import { renewOnReturn } from './renewal'

export default definePlugin({
  name: 'git',
  description: "Follows the git status of a thread's folder on its PC: leases the server watch, keeps it renewed and applies pushed changes, and lists the folder's branches",
  inject: { wire, pcs },
  apply(ctx) {
    const client = createStatusClient(ctx, ctx.wire)
    renewOnReturn(ctx, client, ctx.pcs)
    ctx.provide(gitStatusClient, { follow: client.follow, current: client.current, status: client.status, refresh: client.refresh, branches: client.branches })
  },
})
