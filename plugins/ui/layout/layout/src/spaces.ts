import { owned } from '@sand/reactive'
import { byOrder } from '@sand/util'
import { addressParam, addressParams, addressState, onAddressChange, pushAddress, updateAddress } from '@sand/web-client/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { spaceOpen, type Space, type Spaces } from './contract'

const key = 'space'

export const spaceBoard = (ctx: Context): Spaces => {
  const registered = sig<Space[]>([])
  const requested = sig(addressParam(key))
  const active = owned(ctx, () =>
    derive(() => {
      const list = registered.get()
      return (list.find(space => space.id === requested.get()) ?? list[0])?.id
    }),
  )
  ctx.effect(() => onAddressChange(() => requested.set(addressParam(key))))

  return {
    space(space) {
      registered.update(list => [...list, space].sort(byOrder))
      return () => registered.update(list => list.filter(other => other !== space))
    },
    list: () => registered.get(),
    active: () => active.get(),
    open(id, { replace = false } = {}) {
      ctx.emit(spaceOpen, id)
      if (replace) updateAddress({ [key]: id })
      else if (id !== active.get()) pushAddress({ ...addressParams(), [key]: id }, addressState())
      requested.set(id)
    },
  }
}
