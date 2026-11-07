import { z } from 'zod'
import type { SourceItem } from '../contract'
import type { Source } from './cli'

const credential = 'BWS_ACCESS_TOKEN'
const json = ['--output', 'json']

const listed = z.object({ id: z.string(), key: z.string() })

const held = z.object({ value: z.string() })

const itemOf = ({ id, key }: z.infer<typeof listed>): SourceItem => ({ source: 'bitwarden-secrets', item: id, name: key, kind: 'key', sites: [], totp: false })

export const bitwardenSecrets: Source = {
  label: 'Bitwarden Secrets Manager',
  command: 'bws',
  credential,
  needs: 'Bitwarden Secrets Manager has no access token: set one in Settings → Logins',
  kinds: ['key'],
  errors: [
    [/access.?token|invalid_client|unauthori[sz]ed|\b40[13]\b/i, 'Bitwarden Secrets Manager refused the access token: set a new one in Settings → Logins'],
    [/not found|\b404\b/i, "Bitwarden Secrets Manager has no such secret, or the machine account can't read it"],
  ],
  status: async cli => ({ status: cli.connected ? 'ready' : 'signed-out' }),
  async connect(cli, token) {
    await cli.text(['project', 'list', ...json], { [credential]: token })
    return token
  },
  search: async cli => (await cli.json(z.array(listed), ['secret', 'list', ...json])).map(itemOf),
  item: async (cli, { item }) => itemOf(await cli.json(listed, ['secret', 'get', item, ...json])),
  values: async (cli, { item }) => ({ kind: 'key', value: (await cli.json(held, ['secret', 'get', item, ...json])).value }),
}
