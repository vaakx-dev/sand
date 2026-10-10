import { batch, contextMenu, sig } from '@sand/dom'
import type { PanelContext } from '../actions'

export const FAVOURITES = ':favourites'

const startAt = (ctx: PanelContext) => {
  const state = ctx.models.state()
  const source = ctx.models.info((state?.next ?? state?.current)?.model)?.source
  return source && ctx.models.sources().some(known => known.id === source) ? source : FAVOURITES
}

export const openView = (ctx: PanelContext) => ({
  at: sig(startAt(ctx)),
  query: sig(''),
  fresh: new Set(
    ctx.models
      .list()
      .filter(model => model.fresh)
      .map(model => model.id),
  ),
  seen: new Set<string>(),
  place: '',
  scroll: 0,
  focus: '',
  menu: contextMenu(),
})

export type View = ReturnType<typeof openView>

export const goTo = (view: View, at: string) =>
  batch(() => {
    view.query.set('')
    view.at.set(at)
  })
