import { errorMessage, matching } from '@sand/util'
import { type External, externalSources, type LoginKind, type Pointer, type SourceStatus } from '../contract'
import { onePassword } from './1password'
import { bitwarden } from './bitwarden'
import { bitwardenSecrets } from './bitwarden-secrets'
import { cliOf, type Source } from './cli'

export type Credentials = Partial<Record<External, string>>

export type Commands = Record<External, string>

interface Deps {
  redact(text: string): string
  save(): Promise<void>
  changed(): void
}

const table: Record<External, Source> = { bitwarden, 'bitwarden-secrets': bitwardenSecrets, '1password': onePassword }

const shownItems = 200

const syncMs = 5 * 60_000

export const sourceLabel = (source: External) => table[source].label

export const createSources = (commands: Commands, stored: Credentials, deps: Deps) => {
  let credentials = stored
  let statuses: Record<External, SourceStatus> = { bitwarden: { status: 'missing' }, 'bitwarden-secrets': { status: 'missing' }, '1password': { status: 'missing' } }
  const synced: Partial<Record<External, number>> = {}

  const cliFor = (source: External) => cliOf(table[source], commands[source], credentials[source], deps.redact)

  const ready = (source: External) => {
    const { needs } = table[source]
    if (needs && !credentials[source]) throw new Error(needs)
    return cliFor(source)
  }

  const check = async (source: External): Promise<SourceStatus> => {
    if (!Bun.which(commands[source])) return { status: 'missing' }
    const saved = Boolean(credentials[source])
    return table[source].status(cliFor(source)).then(
      found => ({ ...found, saved }),
      (error: unknown) => ({ status: 'failed', message: errorMessage(error), saved }),
    )
  }

  const sync = async (source: External) => {
    const { sync } = table[source]
    if (!sync) return
    await sync(ready(source))
    synced[source] = Date.now()
  }

  const refresh = async (only?: External) => {
    const checked = await Promise.all((only ? [only] : externalSources).map(async source => [source, await check(source)] as const))
    statuses = { ...statuses, ...Object.fromEntries(checked) }
    deps.changed()
  }

  const store = async (source: External, credential: string | undefined) => {
    const next = { ...credentials }
    delete next[source]
    credentials = credential ? { ...next, [source]: credential } : next
    await deps.save()
  }

  const fetched = <T>(source: External, fetching: Promise<T>) =>
    fetching.catch((error: unknown) => {
      void refresh(source)
      throw error
    })

  return {
    statuses: () => statuses,
    credentials: () => credentials,
    refresh,
    kinds: (source: External): readonly LoginKind[] => table[source].kinds,
    async connect(source: External, secret: string) {
      await store(source, await table[source].connect(cliFor(source), secret))
      try {
        await sync(source)
      } finally {
        await refresh(source)
      }
    },
    async disconnect(source: External) {
      const cli = cliFor(source)
      await store(source, undefined)
      try {
        await table[source].disconnect?.(cli)
      } finally {
        await refresh(source)
      }
    },
    async search(source: External, query: string) {
      if (Date.now() - (synced[source] ?? 0) > syncMs) await sync(source)
      const found = (await table[source].search(ready(source))).sort((a, b) => a.name.localeCompare(b.name))
      const texts = found.map(({ name, sites, place }) => [name, ...sites, place].filter(Boolean).join(' '))
      return matching(texts, query, true)
        .slice(0, shownItems)
        .map(index => found[index]!)
    },
    item: (pointer: Pointer) => table[pointer.source].item(ready(pointer.source), pointer),
    values: (pointer: Pointer, kind: LoginKind) => fetched(pointer.source, table[pointer.source].values(ready(pointer.source), pointer, kind)),
    code(pointer: Pointer) {
      const { label, code } = table[pointer.source]
      if (!code) throw new Error(`${label} keeps no authenticator codes`)
      return fetched(pointer.source, code(ready(pointer.source), pointer))
    },
  }
}

export type Sources = ReturnType<typeof createSources>
