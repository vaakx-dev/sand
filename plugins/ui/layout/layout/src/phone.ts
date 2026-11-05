import { addressLayer, leaveLayer, pushLayer } from '@sand/web-client/contract'
import { onTimeout, sig } from '@vaakx-dev/vrui'
import type { Swipe } from './contract'

export type Drawer = 'side' | 'aside'

export type Pane = Drawer | 'thread'

export type Phone =
  | { kind: 'rest'; pane: Pane; animate: boolean }
  | { kind: 'drag'; drawer: Drawer; from: Pane; px: number; reach: number }
  | { kind: 'settle'; drawer: Drawer; to: Pane; px: number; reach: number }

interface Pull {
  drawer: Drawer
  reach: number
}

export const settleMs = 250

const projection = 180

const rem = 20

const opening: Record<Drawer, number> = { side: 1, aside: -1 }

const pullOf = (drawer: Drawer): Pull => {
  const viewport = document.documentElement.clientWidth
  const side = Math.min(rem * parseFloat(getComputedStyle(document.documentElement).fontSize), viewport * 0.85)
  return { drawer, reach: drawer === 'side' ? side : viewport }
}

const isDrawer = (value: unknown): value is Drawer => value === 'side' || value === 'aside'

const paneOf = (phone: Phone): Pane => {
  if (phone.kind === 'rest') return phone.pane
  return phone.kind === 'drag' ? phone.from : phone.to
}

export const showing = (phone: Phone, drawer: Drawer) => (phone.kind === 'rest' ? phone.pane === drawer : phone.drawer === drawer)

const addressPane = (): Pane => {
  const layer = addressLayer()
  return isDrawer(layer) ? layer : 'thread'
}

export const phoneNavigation = (available: (drawer: Drawer) => boolean, owner: () => Node, changed: () => void) => {
  const state = sig<Phone>({ kind: 'rest', pane: addressPane(), animate: false })
  let settling: (() => void) | undefined

  const become = (next: Phone, record: boolean) => {
    settling?.()
    settling = undefined
    const before = paneOf(state.get())
    state.set(next)
    const after = paneOf(next)
    if (before === after) return
    if (record && after === 'thread') leaveLayer()
    else if (record) pushLayer(after)
    changed()
  }

  const show = (pane: Pane) => become({ kind: 'rest', pane, animate: pane !== 'thread' }, true)

  const handOff = () => become({ kind: 'rest', pane: 'thread', animate: false }, false)

  const follow = () => {
    const pane = addressPane()
    if (pane !== paneOf(state.get())) become({ kind: 'rest', pane, animate: pane !== 'thread' }, false)
  }

  const swipe = (): Swipe => {
    const from = paneOf(state.get())
    let pull = isDrawer(from) ? pullOf(from) : undefined
    let px = 0
    const toward = (dx: number) => {
      const drawer = dx > 0 ? 'side' : 'aside'
      return dx !== 0 && available(drawer) ? pullOf(drawer) : undefined
    }

    return {
      move(dx) {
        pull ??= toward(dx)
        if (!pull) return
        const { drawer, reach } = pull
        px = Math.min(Math.max((from === drawer ? reach : 0) + opening[drawer] * dx, 0), reach)
        become({ kind: 'drag', drawer, from, px, reach }, false)
      },
      end(velocity) {
        if (!pull) return
        const { drawer, reach } = pull
        const to = px + opening[drawer] * velocity * projection > reach / 2 ? drawer : 'thread'
        become({ kind: 'settle', drawer, to, px: to === drawer ? reach : 0, reach }, true)
        settling = onTimeout(() => become({ kind: 'rest', pane: to, animate: false }, false), settleMs, owner())
      },
    }
  }

  return { state, pane: () => paneOf(state.get()), show, handOff, follow, swipe }
}
