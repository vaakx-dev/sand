import type { Pairing } from '@sand/protocol'
import { effect, errorMessage, onTimeout, resource, sig, untrack, type Sig } from '@sand/dom'
import { pageLink } from '@sand/kit'
import type { Context } from 'drydock'

const pairingCode = (ctx: Context<'wire'>, used: Sig<number>) => {
  const pairing = sig<Pairing | undefined>(undefined)
  const expired = sig(0)
  effect(() => {
    used.get()
    expired.get()
    let current = true
    untrack(() =>
      ctx.wire
        .call<Pairing>({ type: 'server.pair' })
        .then(next => {
          if (current) pairing.set(next)
        })
        .catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' })),
    )
    return () => {
      current = false
    }
  })
  effect(() => {
    const active = pairing.get()
    if (active) onTimeout(() => expired.update(count => count + 1), active.ttl - 5_000)
  })
  return pairing.map(active => active?.code)
}

export const deviceLinks = (ctx: Context<'wire'>, used: Sig<number>) => {
  const urls = resource(() => ctx.wire.call<string[]>({ type: 'server.urls' }))
  const links = urls.data.map(list => (list ?? []).map(url => pageLink(url, ctx.wire.token)))
  const share = async () => {
    try {
      urls.data.set(await ctx.wire.call<string[]>({ type: 'server.lan' }))
    } catch (error) {
      ctx.notify?.push(errorMessage(error), { level: 'error' })
    }
  }
  return { urls, links, share, code: pairingCode(ctx, used) }
}

export type DeviceLinks = ReturnType<typeof deviceLinks>
