import { z } from 'zod'
import type { SourceItem } from '../contract'
import { sitesOf } from '../site'
import { lacks, type Ref, type Source } from './cli'

const label = '1Password'
const credential = 'OP_SERVICE_ACCOUNT_TOKEN'
const json = ['--format', 'json']

const whoami = z.object({ url: z.string() })

const accounts = z.array(z.object({ email: z.string().optional(), url: z.string(), account_uuid: z.string() }))

const listed = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  vault: z.object({ id: z.string(), name: z.string() }),
  urls: z.array(z.object({ href: z.string() })).optional(),
})

const described = listed.extend({ fields: z.array(z.object({ type: z.string() })).optional() })

const held = z.object({
  fields: z.array(z.object({ id: z.string(), type: z.string(), purpose: z.string().optional(), value: z.string().optional() })).optional(),
})

const hostOf = (url: string) => URL.parse(url)?.hostname ?? url

const itemOf = ({ id, title, category, vault, urls }: z.infer<typeof listed>, account?: string): SourceItem => ({
  source: '1password',
  item: id,
  vault: vault.id,
  ...(account && { account }),
  name: title,
  kind: category === 'LOGIN' ? 'website' : 'key',
  sites: sitesOf((urls ?? []).map(({ href }) => href)),
  place: vault.name,
})

const target = ({ item, vault, account }: Ref) => ['item', 'get', item, ...(vault ? ['--vault', vault] : []), ...(account ? ['--account', account] : [])]

const signedOut = "1Password isn't signed in: unlock the 1Password app with its CLI integration on, or set a service account token in Settings → Logins"

export const onePassword: Source = {
  label,
  command: 'op',
  credential,
  kinds: ['website', 'key'],
  errors: [
    [/service.?account|SACredentials|invalid token/i, '1Password refused the service account token: set a new one in Settings → Logins'],
    [/signed in|sign in|signin|no accounts?|authori[sz]|unlock|locked/i, signedOut],
    [/isn't an item|isn't a vault|not found/i, '1Password has no such item any more: pick it again in Settings → Logins'],
  ],
  async status(cli) {
    if (cli.connected) return { status: 'ready', account: hostOf((await cli.json(whoami, ['whoami', ...json])).url) }
    const found = await cli.json(accounts, ['account', 'list', ...json])
    return found.length ? { status: 'ready', account: found.map(({ email, url }) => email ?? hostOf(url)).join(', ') } : { status: 'signed-out' }
  },
  async connect(cli, token) {
    await cli.json(whoami, ['whoami', ...json], { [credential]: token })
    return token
  },
  async search(cli) {
    if (cli.connected) return (await cli.json(z.array(listed), ['item', 'list', ...json])).map(item => itemOf(item))
    const found = await cli.json(accounts, ['account', 'list', ...json])
    if (!found.length) throw new Error(signedOut)
    const lists = await Promise.all(
      found.map(async ({ account_uuid }) => (await cli.json(z.array(listed), ['item', 'list', '--account', account_uuid, ...json])).map(item => itemOf(item, account_uuid))),
    )
    return lists.flat()
  },
  async item(cli, ref) {
    const found = await cli.json(described, [...target(ref), ...json])
    return { ...itemOf(found, ref.account), totp: (found.fields ?? []).some(({ type }) => type === 'OTP') }
  },
  async values(cli, ref, kind) {
    const fields = (await cli.json(held, [...target(ref), '--reveal', ...json])).fields ?? []
    const valueOf = (pick: (field: (typeof fields)[number]) => boolean) => fields.find(field => pick(field) && field.value)?.value
    const password = valueOf(({ purpose }) => purpose === 'PASSWORD')
    if (kind === 'key') {
      const value = password ?? valueOf(({ id }) => id === 'credential') ?? valueOf(({ type }) => type === 'CONCEALED')
      if (!value) throw lacks(label, 'password or credential')
      return { kind, value }
    }
    const username = valueOf(({ purpose }) => purpose === 'USERNAME')
    if (!username) throw lacks(label, 'username')
    if (!password) throw lacks(label, 'password')
    return { kind, username, password }
  },
  code: async (cli, ref) => (await cli.text([...target(ref), '--otp'])).trim(),
}
