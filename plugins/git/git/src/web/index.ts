import { wire } from '@sand/devices-contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { gitStatusClient } from '../contract'
import { createStatusClient } from './client'
import { followCurrent } from './current'
import { renewOnReturn } from './renewal'

export default definePlugin({
  name: 'git',
  description: "Follows the git status of a thread's folder on its PC: leases the server watch, keeps it renewed and applies pushed changes, follows the open thread's folder and lists the folder's branches",
  inject: { wire, threads },
  apply(ctx) {
    const client = createStatusClient(ctx, ctx.wire)
    renewOnReturn(ctx, client)
    const current = followCurrent(ctx, ctx.threads, client)
    ctx.provide(gitStatusClient, { current, follow: client.follow, status: client.status, rewatch: client.rewatch, branches: client.branches })
  },
})
