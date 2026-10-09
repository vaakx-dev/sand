import type { PickItem, PickOptions, Picked } from '@sand/protocol'
import { tell, type Peer } from './peer'

export interface PickAnswer {
  index: number | null
  action?: string
  query?: string
}

interface Waiting {
  peer: Peer
  resolve(answer: unknown): void
}

export class Picks {
  private waiting = new Map<string, Waiting>()

  choose<T>(peer: Peer, title: string, items: PickItem<T>[], options?: PickOptions) {
    return new Promise<Picked<T> | undefined>(resolve => {
      const id = this.wait(peer, answer => {
        const { index, action, query = '' } = (answer ?? { index: null }) as PickAnswer
        if (index === null && !action) return resolve(undefined)
        resolve({ value: index === null ? undefined : items[index]?.value, action, query })
      })
      tell(peer, 'ui.pick', { id, title, items: items.map(({ value: _, ...item }) => item), options })
    })
  }

  input(peer: Peer, title: string, value?: string) {
    return new Promise<string | undefined>(resolve => {
      const id = this.wait(peer, answer => resolve((answer as string | null | undefined) ?? undefined))
      tell(peer, 'ui.input', { id, title, value })
    })
  }

  answer(peer: Peer, id: string, answer: unknown) {
    const found = this.waiting.get(id)
    if (found?.peer !== peer) return false
    this.waiting.delete(id)
    found.resolve(answer)
    return true
  }

  drop(peer?: Peer) {
    for (const [id, found] of this.waiting) {
      if (peer && found.peer !== peer) continue
      this.waiting.delete(id)
      found.resolve(undefined)
    }
  }

  private wait(peer: Peer, resolve: (answer: unknown) => void) {
    const id = Bun.randomUUIDv7()
    this.waiting.set(id, { peer, resolve })
    return id
  }
}
