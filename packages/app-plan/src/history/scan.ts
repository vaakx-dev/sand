import type { AppTurn } from '@sand/accounts/contract'
import type { Listed } from './files'

interface Log<State> {
  list(): Promise<Listed[]>
  read(listed: Listed, grown: State | undefined): Promise<State>
  turns(states: State[]): AppTurn[]
}

interface Known<State> {
  listed: Listed
  state: State
}

interface Scanning {
  since: number
  done: Promise<void>
}

type History = (since: number) => Promise<AppTurn[]>

const fileHistory = <State>({ list, read, turns }: Log<State>): History => {
  const known = new Map<string, Known<State>>()
  let scanning: Scanning | undefined

  const refresh = async (listed: Listed) => {
    const before = known.get(listed.path)
    if (before?.listed.stamp === listed.stamp) return
    const grown = before && before.listed.size <= listed.size ? before.state : undefined
    const state = await read(listed, grown).catch(() => undefined)
    if (state !== undefined) known.set(listed.path, { listed, state })
  }

  const forgetMissing = (listed: Listed[]) => {
    const present = new Set(listed.map(({ path }) => path))
    for (const path of known.keys()) if (!present.has(path)) known.delete(path)
  }

  const scan = async (since: number) => {
    const listed = await list()
    forgetMissing(listed)
    for (const file of listed.filter(({ mtimeMs }) => mtimeMs >= since)) await refresh(file)
  }

  const scanned = (since: number) => {
    if (scanning && scanning.since <= since) return scanning.done
    const earlier = scanning?.done.catch(() => {}) ?? Promise.resolve()
    const done = earlier
      .then(() => scan(since))
      .finally(() => {
        if (scanning?.done === done) scanning = undefined
      })
    scanning = { since, done }
    return done
  }

  return async since => {
    await scanned(since)
    return turns([...known.values()].map(({ state }) => state)).filter(({ at }) => at >= since)
  }
}

export { fileHistory }
