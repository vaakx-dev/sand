import type { Picked, PickItem, PickOptions } from '../contract'
import { tell, type Peer } from './peer'

interface PickAnswer {
  index: number | null
  action?: string
  query?: string
}

const createWaits = <A>() => {
  const waiting = new Map<string, { peer: Peer; resolve(answer?: A): void }>()

  const wait = (peer: Peer, resolve: (answer?: A) => void) => {
    const id = Bun.randomUUIDv7()
    waiting.set(id, { peer, resolve })
    return id
  }

  const answer = (peer: Peer, id: string, answer: A) => {
    const found = waiting.get(id)
    if (found?.peer !== peer) return false
    waiting.delete(id)
    found.resolve(answer)
    return true
  }

  const drop = (peer?: Peer) => {
    for (const [id, found] of waiting) {
      if (peer && found.peer !== peer) continue
      waiting.delete(id)
      found.resolve(undefined)
    }
  }

  return { wait, answer, drop }
}

export const createPicks = () => {
  const picks = createWaits<PickAnswer>()
  const inputs = createWaits<string | null>()

  const choose = <T>(peer: Peer, title: string, items: PickItem<T>[], options?: PickOptions) =>
    new Promise<Picked<T> | undefined>(resolve => {
      const id = picks.wait(peer, answer => {
        const { index, action, query = '' } = answer ?? { index: null }
        if (index === null && !action) return resolve(undefined)
        resolve({ value: index === null ? undefined : items[index]?.value, action, query })
      })
      tell(peer, 'ui.pick', { id, title, items: items.map(({ value: _, ...item }) => item), options })
    })

  const input = (peer: Peer, title: string, value?: string) =>
    new Promise<string | undefined>(resolve => {
      const id = inputs.wait(peer, answer => resolve(answer ?? undefined))
      tell(peer, 'ui.input', { id, title, value })
    })

  const drop = (peer?: Peer) => {
    picks.drop(peer)
    inputs.drop(peer)
  }

  return { choose, input, answerPick: picks.answer, answerInput: inputs.answer, drop }
}

export type Picks = ReturnType<typeof createPicks>
