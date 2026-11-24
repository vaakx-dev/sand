import type { AppTurn } from '@sand/accounts/contract'
import { fieldsOf, type Json } from '../json'
import type { Listed } from './files'
import { fileHistory } from './scan'

interface JsonlLog<State> {
  list(): Promise<Listed[]>
  start(): State
  wanted(text: string): boolean
  record(state: State, record: Json): void
  turns(states: State[]): AppTurn[]
}

interface Tail<State> {
  consumed: number
  state: State
}

const completeLines = async function* (path: string, start: number, end: number) {
  const decoder = new TextDecoder()
  let pending = ''
  for await (const chunk of Bun.file(path).slice(start, end).stream()) {
    const lines = (pending + decoder.decode(chunk, { stream: true })).split('\n')
    pending = lines.pop() ?? ''
    yield* lines
  }
}

const parsed = (text: string) => {
  try {
    return fieldsOf(JSON.parse(text))
  } catch {
    return undefined
  }
}

const jsonlHistory = <State>({ list, start, wanted, record, turns }: JsonlLog<State>) =>
  fileHistory<Tail<State>>({
    list,
    async read({ path, size }, grown) {
      const state = grown?.state ?? start()
      let consumed = grown?.consumed ?? 0
      for await (const text of completeLines(path, consumed, size)) {
        consumed += Buffer.byteLength(text) + 1
        const found = wanted(text) ? parsed(text) : undefined
        if (found) record(state, found)
      }
      return { consumed, state }
    },
    turns: tails => turns(tails.map(({ state }) => state)),
  })

export { jsonlHistory }
