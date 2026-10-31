import { wireHello } from '@sand/devices-contract'
import type { ListedTurn, SnapshotSide, TurnSnapshots } from '@sand/git-snapshots/contract'
import { threadSelect, threadsChange } from '@sand/web-client/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { TurnsContext } from '../inject'

interface Followed {
  turns: Sig<ListedTurn[]>
  ticket: number
}

export interface RestoreInput {
  session: string
  turn: string
  to: SnapshotSide
}

export const snapshotStore = (ctx: TurnsContext) => {
  const followed = new Map<string, Followed>()

  const take = ({ session, turns }: TurnSnapshots) => {
    const found = followed.get(session)
    if (!found) return
    found.ticket++
    found.turns.set(turns)
  }

  const load = (session: string) => {
    const found = followed.get(session)
    if (!found) return
    const mine = ++found.ticket
    ctx.snapshots.list({ session }).then(
      next => {
        if (found.ticket === mine) found.turns.set(next.turns)
      },
      () => undefined,
    )
  }

  const of = (session: string) => {
    const known = followed.get(session)
    if (known) return known.turns
    const found: Followed = { turns: sig<ListedTurn[]>([]), ticket: 0 }
    followed.set(session, found)
    load(session)
    return found.turns
  }

  const forget = () => {
    for (const session of [...followed.keys()]) if (!ctx.threads.get(session)) followed.delete(session)
  }

  const restore = async (input: RestoreInput) => {
    const next = await ctx.snapshots.restore(input)
    take(next)
    return next
  }

  ctx.effect(() => ctx.snapshots.onChange(take))
  ctx.on(threadSelect, session => {
    if (session && followed.has(session)) load(session)
  })
  ctx.on(threadsChange, forget)
  ctx.on(wireHello, () => {
    for (const session of followed.keys()) load(session)
  })

  return { of, restore }
}

export type SnapshotStore = ReturnType<typeof snapshotStore>
