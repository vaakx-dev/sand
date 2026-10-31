import { effect, untrack } from '@vaakx-dev/vrui'
import { listModel } from '../list/model'
import type { PageParts } from '../parts'
import { pageView } from './view'

export type SharedParts = Omit<PageParts, 'list'>

const reloadOnAuth = ({ github, list }: PageParts) => {
  let was = untrack(() => github.signedIn.get())
  let seen = untrack(() => github.changes.get())
  effect(() => {
    const now = github.signedIn.get()
    const changes = github.changes.get()
    if (now && (!was || changes !== seen)) untrack(() => list.load())
    was = now
    seen = changes
  })
}

const followChanges = (parts: PageParts) => {
  const { ctx, list } = parts
  reloadOnAuth(parts)
  effect(() => ctx.inbox.onRow(list.patch))
  effect(() =>
    ctx.inbox.onCount(() => {
      if (list.view.get() === 'needs') list.quietReload()
    }),
  )
}

export const buildPage = (shared: SharedParts) => {
  const list = listModel(shared.ctx, shared.query, shared.repos)
  const parts: PageParts = { ...shared, list }
  followChanges(parts)
  return pageView(parts)
}
