import { effect, untrack } from '@vaakx-dev/vrui'
import { listModel } from '../list/model'
import type { PageParts } from '../parts'
import { pageView } from './view'

export type SharedParts = Omit<PageParts, 'list'>

const reloadOnAccount = ({ account, list }: PageParts) => {
  let was = untrack(() => account.get())
  effect(() => {
    const now = account.get()
    if (now && now !== was) untrack(() => list.load())
    was = now
  })
}

const followChanges = (parts: PageParts) => {
  const { ctx, list } = parts
  reloadOnAccount(parts)
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
