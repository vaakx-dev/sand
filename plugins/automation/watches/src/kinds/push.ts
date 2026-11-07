import { readServerInfo } from '@sand/boot'
import { cli } from '@sand/config/contract'
import { github } from '@sand/github/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { watcher } from '@sand/watch/contract'
import type { Context } from 'drydock'
import type { Watches } from '../contract'
import { fileKind } from './file'
import { folderKind } from './folder'
import { githubKind } from './github'
import { isLoopback, webhookKind } from './webhook'

const sandUrl = (ctx: Context) => async () => {
  const home = ctx.get(cli)?.home
  const info = home ? await readServerInfo(home) : undefined
  return info?.urls.find(url => !isLoopback(url)) ?? info?.url
}

export const registerPushKinds = (ctx: Context, watches: Watches) => {
  ctx.watch(watcher, found => found && joinDisposers(watches.kind(fileKind(found)), watches.kind(folderKind(found))))
  ctx.watch(server, found => found && watches.kind(webhookKind(found, sandUrl(ctx))))
  ctx.watch(github, found => found && watches.kind(githubKind(found)))
}
