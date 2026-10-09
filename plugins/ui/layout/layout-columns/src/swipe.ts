import type { Swipe } from './contract'
import { batch, onTimeout, type Sig, type Store } from '@sand/dom'
import type { Open } from './shell'
import { drawerWidth, settleMs, type Shift } from './slide'

const projection = 180

export interface SwipeState {
  open: Store<Open>
  shift: Sig<Shift | undefined>
  swiped: Sig<boolean>
  commit(next: Open): void
}

const nearest = (points: number[], to: number) => points.reduce((best, point) => (Math.abs(point - to) < Math.abs(best - to) ? point : best))

const opened = (target: number): Open => ({ side: target > 0, aside: target < 0 })

export const swiper = ({ open, shift, swiped, commit }: SwipeState) => {
  let settling: (() => void) | undefined

  return (): Swipe => {
    settling?.()
    settling = undefined
    const width = document.documentElement.clientWidth
    const side = drawerWidth(width)
    const base = open.side.get() ? side : open.aside.get() ? -width : 0
    const follow = (px: number, settle = false) => shift.set({ px, settling: settle })
    let px = base
    batch(() => {
      swiped.set(true)
      follow(base)
    })

    return {
      move(dx) {
        px = Math.min(Math.max(base + dx, -width), side)
        follow(px)
      },
      end(velocity) {
        const target = nearest([-width, 0, side], px + velocity * projection)
        batch(() => {
          commit(opened(target))
          follow(target, true)
        })
        settling = onTimeout(() => {
          settling = undefined
          batch(() => {
            shift.set(undefined)
            if (!open.side.get()) swiped.set(false)
          })
        }, settleMs)
      },
    }
  }
}
