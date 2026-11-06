import { addressParam, addressParams, addressState, backAddress, onAddressChange, pushAddress, updateAddress } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const newBot = 'new'

export interface Route {
  bot?: string
  profile: boolean
}

const botKey = 'bot'
const viewKey = 'botView'
const depthKey = 'botsDepth'
const profileKey = 'botProfile'

const depth = () => {
  const value = addressState()[depthKey]
  return typeof value === 'number' ? value : 0
}

const read = (): Route => ({ bot: addressParam(botKey), profile: addressParam(viewKey) === 'profile' })

export const createAddress = (ctx: Context) => {
  const route = sig(read())
  const last = sig(route.get().bot)
  const sync = () => {
    const next = read()
    if (next.bot) last.set(next.bot)
    route.set(next)
  }
  ctx.effect(() => onAddressChange(sync))

  const write = (change: () => void) => {
    change()
    sync()
  }

  const drop = () => write(() => updateAddress({ [botKey]: undefined, [viewKey]: undefined }, { [profileKey]: false }))

  return {
    route,
    current: (): Route => ({ ...route.get(), bot: route.get().bot ?? last.get() }),
    drop,
    open: (bot: string) => write(() => pushAddress({ ...addressParams(), [botKey]: bot, [viewKey]: undefined }, { [depthKey]: 1 })),
    show: (bot: string) => write(() => updateAddress({ [botKey]: bot, [viewKey]: undefined }, { [profileKey]: false })),
    profile: (bot: string) =>
      write(() => pushAddress({ ...addressParams(), [botKey]: bot, [viewKey]: 'profile' }, { ...addressState(), [profileKey]: true, [depthKey]: depth() && depth() + 1 })),
    chat() {
      if (addressState()[profileKey]) backAddress()
      else write(() => updateAddress({ [viewKey]: undefined }))
    },
    leave() {
      if (depth()) backAddress(depth())
      else drop()
    },
  }
}

export type Address = ReturnType<typeof createAddress>
