import { batch, contextMenu, sig } from '@sand/dom'
import type { PickerTarget } from '../contract'
import type { PickerContext } from '../kit'

export const FAVOURITES = ':favourites'

const startAt = (ctx: PickerContext, target: PickerTarget) => {
  const source = ctx.models.info(target.shown()?.model)?.source
  return source && ctx.models.sources().some(known => known.id === source) ? source : FAVOURITES
}

export const openView = (ctx: PickerContext, target: PickerTarget) => ({
  at: sig(startAt(ctx, target)),
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
