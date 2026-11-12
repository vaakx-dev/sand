import type { InputOf } from '@sand/host-hub/contract'
import { externalSources, loginKinds, loginPick, sourceConnect, sourceDisconnect, sourceSearch } from '@sand/logins/contract'
import type { McpTool } from '@sand/mcp-server/contract'
import { z } from 'zod'
import { group, name, secret, site } from './fields'

type Picked = InputOf<typeof loginPick>

const source = z.enum(externalSources).describe('The password manager: bitwarden, bitwarden-secrets (Bitwarden Secrets Manager) or 1password')

const sourceInput = z.object({ source })

const connectInput = z.object({
  source,
  secret: secret.describe("What signs sand in: Bitwarden's master password, a Bitwarden Secrets Manager access token or a 1Password service account token"),
})

const searchInput = z.object({ source, query: z.string().trim().max(200).describe('Words in the item name or site; empty lists everything') })

const pickInput = z.object({
  source,
  item: z.string().trim().min(1).describe('The item id from login_manager_search'),
  vault: z.string().trim().min(1).optional().describe('For 1Password, the vault id from login_manager_search'),
  account: z.string().trim().min(1).optional().describe('For 1Password, the account from login_manager_search, if it has one'),
  name: name.optional().describe("What to call it (default: the item's name)"),
  site: site.optional().describe("For a website login, its domain (default: the item's first site)"),
  kind: z.enum(loginKinds).optional().describe("website or key (default: what the item holds)"),
})

const pickedOf = ({ source, item, vault, account, ...chosen }: z.output<typeof pickInput>): Picked => {
  if (source !== '1password') return { source, item, ...chosen }
  if (!vault) throw new Error('A 1Password item needs its vault')
  return { source, item, vault, ...(account && { account }), ...chosen }
}

const connectTool: McpTool<typeof connectInput> = {
  name: 'login_manager_connect',
  description:
    "Connect a password manager so its items can become saved logins: sand keeps what you give it encrypted and never shows it again. Returns the manager's status (signed-in account, locked or failed)",
  input: connectInput,
  secret: ['secret'],
  access: 'operate',
  group: group.name,
  run: async ({ source, secret }, { call }) => (await call(sourceConnect, { source, secret })).sources[source],
}

const disconnectTool: McpTool<typeof sourceInput> = {
  name: 'login_manager_disconnect',
  description: "Disconnect a password manager: sand forgets how to sign in to it, and the logins that point at it stop working until it's connected again",
  input: sourceInput,
  access: 'operate',
  group: group.name,
  run: async ({ source }, { call }) => (await call(sourceDisconnect, { source })).sources[source],
}

const searchTool: McpTool<typeof searchInput> = {
  name: 'login_manager_search',
  description: "Search a connected password manager's items by name or site: their ids, names, kinds and sites, never their values",
  input: searchInput,
  access: 'read',
  group: group.name,
  run: (input, { call }) => call(sourceSearch, input),
}

const pickTool: McpTool<typeof pickInput> = {
  name: 'login_manager_pick',
  description:
    "Save a password manager's item as a login that points at it: sand reads the value from the manager each time it's used and never copies it. Picked by one of sand's own threads or bots, that thread or bot may use it at once. Returns the login",
  input: pickInput,
  access: 'operate',
  group: group.name,
  run: (input, { call }) => call(loginPick, pickedOf(input)),
}

const managerTools: McpTool[] = [connectTool, disconnectTool, searchTool, pickTool]

export { managerTools }
