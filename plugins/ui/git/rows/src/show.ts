import { drafts, draftsChange } from '@sand/composer/contract'
import type { GitStatusClient } from '@sand/git/contract'
import type { Sidebar } from '@sand/sidebar/contract'
import { threads, threadsChange } from '@sand/web-client/contract'
import type { Context, Dispose } from 'drydock'
import { listedPlaces } from './places/listed'
import { placeStatuses } from './places/statuses'
import { gitDecoration } from './rows/decoration'

export const inject = { threads }

export type RowsContext = Context<typeof inject>

export const showGitRows = (ctx: RowsContext, sidebar: Sidebar, client: GitStatusClient): Dispose => {
  const statuses = placeStatuses(client)
  const sync = () => statuses.sync(listedPlaces(ctx.threads.list(), ctx.get(drafts)?.list() ?? []))
  const stops = [ctx.on(threadsChange, sync), ctx.on(draftsChange, sync), ctx.watch(drafts, sync), sidebar.decorate(gitDecoration(statuses))]
  return () => {
    for (const stop of stops) void stop()
    statuses.close()
  }
}
