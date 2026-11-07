import { z } from 'zod'
import type { SourceItem } from '../contract'
import { sitesOf } from '../site'
import { lacks, type Source } from './cli'

const label = 'Bitwarden'
const locked = 'Bitwarden is locked: unlock it in Settings → Logins'
const loginType = 1
const noteType = 2
const quiet = '--nointeraction'
const passwordEnv = 'BW_PASSWORD'

const states = { unauthenticated: 'signed-out', locked: 'locked', unlocked: 'ready' } as const

const status = z.object({ status: z.enum(['unauthenticated', 'locked', 'unlocked']), userEmail: z.string().nullish() })

const listed = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  login: z.object({ uris: z.array(z.object({ uri: z.string().nullish() })).nullish(), totp: z.string().nullish().transform(Boolean) }).nullish(),
})

const held = z.object({
  type: z.number(),
  notes: z.string().nullish(),
  login: z.object({ username: z.string().nullish(), password: z.string().nullish() }).nullish(),
})

const itemOf = ({ id, name, type, login }: z.infer<typeof listed>): SourceItem[] => {
  if (type !== loginType && type !== noteType) return []
  const sites = sitesOf((login?.uris ?? []).flatMap(({ uri }) => uri ?? []))
  return [{ source: 'bitwarden', item: id, name, kind: type === loginType ? 'website' : 'key', sites, totp: Boolean(login?.totp) }]
}

export const bitwarden: Source = {
  label,
  command: 'bw',
  credential: 'BW_SESSION',
  needs: locked,
  kinds: ['website', 'key'],
  errors: [
    [/invalid master password/i, 'That master password is wrong'],
    [/not logged in|unauthenticated/i, "Bitwarden isn't signed in: run bw login in a terminal, then unlock it in Settings → Logins"],
    [/locked/i, locked],
    [/no totp/i, 'That Bitwarden item has no authenticator key'],
    [/not found/i, 'Bitwarden has no such item any more: pick it again in Settings → Logins'],
  ],
  async status(cli) {
    const found = await cli.json(status, ['status', quiet])
    return { status: states[found.status], ...(found.userEmail && { account: found.userEmail }) }
  },
  async connect(cli, password) {
    const session = (await cli.text(['unlock', '--passwordenv', passwordEnv, '--raw', quiet], { [passwordEnv]: password })).trim()
    if (!session) throw new Error("Bitwarden didn't unlock: try again")
    return session
  },
  disconnect: cli => cli.text(['lock', quiet]),
  sync: cli => cli.text(['sync', quiet]),
  search: async cli => (await cli.json(z.array(listed), ['list', 'items', quiet])).flatMap(itemOf),
  async item(cli, { item }) {
    const [found] = itemOf(await cli.json(listed, ['get', 'item', item, quiet]))
    if (!found) throw new Error('That Bitwarden item is neither a login nor a secure note')
    return found
  },
  async values(cli, { item }, kind) {
    const { type, notes, login } = await cli.json(held, ['get', 'item', item, quiet])
    if (kind === 'key') {
      const value = type === noteType ? notes : login?.password
      if (!value) throw lacks(label, type === noteType ? 'note' : 'password')
      return { kind, value }
    }
    if (!login?.username) throw lacks(label, 'username')
    if (!login.password) throw lacks(label, 'password')
    return { kind, username: login.username, password: login.password }
  },
  code: async (cli, { item }) => (await cli.text(['get', 'totp', item, quiet])).trim(),
}
