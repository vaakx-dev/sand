import type { Conversation, SendResult, TurnInfo, WaitUntil } from '../contract'
import type { Owned } from '../owned'

const pollEvery = 1_000

const reached = (info: TurnInfo, until: WaitUntil) => info.ended !== undefined || (until === 'attention' && info.status === 'waiting')

const watched = <C extends Conversation>({ announce }: Owned<C>, done: () => boolean, signal?: AbortSignal) =>
  new Promise<void>(resolve => {
    const check = () => {
      if (!done() && !signal?.aborted) return
      stop()
      resolve()
    }
    const stopChanges = announce.watch(check)
    const timer = setInterval(check, pollEvery)
    const stop = () => {
      stopChanges()
      clearInterval(timer)
      signal?.removeEventListener('abort', check)
    }
    signal?.addEventListener('abort', check)
    check()
  })

export const createWait =
  <C extends Conversation>(owned: Owned<C>) =>
  async (turn: string, until: WaitUntil, signal?: AbortSignal) => {
    const { conversations, stores } = owned
    const latest = () => stores.turns.get(conversations.owner, turn)
    if (!latest()) throw new Error(`No turn ${turn}`)
    await watched(owned, () => reached(latest()!, until), signal)
    return latest()!
  }

export const createFollow = <C extends Conversation>(owned: Owned<C>) => {
  const wait = createWait(owned)
  const { stores } = owned

  const startedFrom = async (conversation: C, pending: string, signal?: AbortSignal) => {
    const turn = () => stores.turns.from(conversation, pending)
    await watched(owned, () => turn() !== undefined || !stores.pending.has(conversation, pending), signal)
    return turn()
  }

  return async (conversation: C, sent: SendResult, signal?: AbortSignal) => {
    const turn = sent.disposition === 'queued' ? await startedFrom(conversation, sent.pending, signal) : sent.turn
    return turn ? wait(turn, 'end', signal) : undefined
  }
}
