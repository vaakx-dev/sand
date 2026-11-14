import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { dynamicChild, sig } from '@vaakx-dev/vrui'

interface Awaiting<T> {
  kit: Kit
  pending: Promise<T>
  failure: string
  shown(value: T): Node
}

type Settled<T> = { kind: 'loading' } | { kind: 'ready'; value: T } | { kind: 'failed'; error: string }

const awaited = <T>({ kit, pending, failure, shown }: Awaiting<T>) => {
  const state = sig<Settled<T>>({ kind: 'loading' })
  pending.then(
    value => state.set({ kind: 'ready', value }),
    (error: unknown) => state.set({ kind: 'failed', error: `${failure}: ${errorMessage(error)}` }),
  )
  return dynamicChild(state, settled => {
    if (settled.kind === 'ready') return shown(settled.value)
    if (settled.kind === 'failed') return kit.errorState({ text: settled.error })
    return kit.loadingState({})
  })
}

export { awaited }
