import { chmodSync } from 'node:fs'
import { join } from 'node:path'

interface BitwardenItem {
  id: string
  name: string
  type: number
  notes?: string | null
  login?: { username?: string; password?: string; totp?: string | null; uris?: { uri: string }[] }
}

interface SecretsItem {
  id: string
  key: string
  value: string
  note: string
  projectId: string
}

interface OnePasswordItem {
  id: string
  title: string
  category: string
  vault: { id: string; name: string }
  urls?: { href: string; primary?: boolean }[]
  fields: { id: string; type: string; purpose?: string; label: string; value?: string }[]
}

export interface World {
  bitwarden: { email: string; password: string; session: string; unlocked: boolean; items: BitwardenItem[]; codes: Record<string, string> }
  secrets: { token: string; items: SecretsItem[] }
  onepassword: { token: string; url: string; items: OnePasswordItem[]; codes: Record<string, string> }
}

const tools = { bw: 'bitwarden', bws: 'secrets', op: 'onepassword' } as const

type Tool = keyof typeof tools

const wrapper = async (folder: string, worldPath: string, tool: Tool) => {
  const call = [process.execPath, import.meta.path, worldPath, tool].map(part => `"${part}"`).join(' ')
  if (process.platform === 'win32') {
    const path = join(folder, `${tool}.cmd`)
    await Bun.write(path, `@${call} %*\r\n`)
    return path
  }
  const path = join(folder, tool)
  await Bun.write(path, `#!/bin/sh\nexec ${call} "$@"\n`)
  chmodSync(path, 0o755)
  return path
}

export const fakeClis = async (folder: string, world: World) => {
  const worldPath = join(folder, 'world.json')
  await Bun.write(worldPath, JSON.stringify(world))
  const [bw, bws, op] = await Promise.all((['bw', 'bws', 'op'] as const).map(tool => wrapper(folder, worldPath, tool)))
  return { paths: { bw: bw!, bws: bws!, op: op! }, world: (): Promise<World> => Bun.file(worldPath).json(), change: (next: World) => Bun.write(worldPath, JSON.stringify(next)) }
}

const fail = (message: string): never => {
  console.error(message)
  process.exit(1)
}

const positional = (args: string[]) => args.filter((arg, at) => !arg.startsWith('--') && !args[at - 1]?.startsWith('--'))

const flag = (args: string[], name: string) => {
  const at = args.indexOf(name)
  return at < 0 ? undefined : args[at + 1]
}

const bitwarden = (world: World, args: string[]) => {
  const vault = world.bitwarden
  const [command, what, id] = positional(args)
  const open = Bun.env.BW_SESSION === vault.session && vault.unlocked
  if (command === 'status') return JSON.stringify({ serverUrl: null, userEmail: vault.email, status: open ? 'unlocked' : 'locked' })
  if (command === 'unlock') {
    if (Bun.env[flag(args, '--passwordenv') ?? ''] !== vault.password) return fail('Invalid master password.')
    vault.unlocked = true
    return vault.session
  }
  if (command === 'lock') {
    vault.unlocked = false
    return 'Your vault is locked.'
  }
  if (!open) return fail('Vault is locked.')
  if (command === 'sync') return 'Syncing complete.'
  if (command === 'list' && what === 'items') return JSON.stringify(vault.items)
  const item = vault.items.find(found => found.id === id) ?? fail('Not found.')
  if (what === 'item') return JSON.stringify(item)
  if (what === 'totp') return vault.codes[item.id] ?? fail('No TOTP available for this login.')
  return fail(`Unknown command ${args.join(' ')}`)
}

const secrets = (world: World, args: string[]) => {
  const [noun, verb, id] = positional(args)
  if (Bun.env.BWS_ACCESS_TOKEN !== world.secrets.token) return fail('Error:\n   0: Received error message from server: [400 Bad Request] {"error":"invalid_client"}')
  if (noun === 'project' && verb === 'list') return '[]'
  if (noun === 'secret' && verb === 'list') return JSON.stringify(world.secrets.items)
  if (noun === 'secret' && verb === 'get') return JSON.stringify(world.secrets.items.find(found => found.id === id) ?? fail('Error:\n   0: Received error message from server: [404 Not Found]'))
  return fail(`Unknown command ${args.join(' ')}`)
}

const onePassword = (world: World, args: string[]) => {
  const vault = world.onepassword
  const [noun, verb, id] = positional(args)
  const token = Bun.env.OP_SERVICE_ACCOUNT_TOKEN
  if (noun === 'account' && verb === 'list') return '[]'
  if (!token) return fail('[ERROR] 2025/01/01 00:00:00 You are not currently signed in. Please run `op signin --help` for instructions')
  if (token !== vault.token) return fail('[ERROR] 2025/01/01 00:00:00 invalid service account token')
  if (noun === 'whoami') return JSON.stringify({ url: vault.url, user_type: 'SERVICE_ACCOUNT' })
  if (noun === 'item' && verb === 'list') return JSON.stringify(vault.items.map(({ fields: _fields, ...meta }) => meta))
  const item =
    vault.items.find(found => found.id === id && found.vault.id === flag(args, '--vault')) ??
    fail(`[ERROR] 2025/01/01 00:00:00 "${id}" isn't an item. Specify the item with its UUID, name, or domain.`)
  if (args.includes('--otp')) return vault.codes[item.id] ?? fail(`[ERROR] 2025/01/01 00:00:00 "${item.title}" has no one-time password`)
  return JSON.stringify(item)
}

const run = { bitwarden, secrets, onepassword: onePassword }

if (import.meta.main) {
  const [worldPath, tool, ...args] = process.argv.slice(2) as [string, Tool, ...string[]]
  const before = await Bun.file(worldPath).text()
  const world: World = JSON.parse(before)
  const secretsOf = [world.bitwarden.password, world.bitwarden.session, world.secrets.token, world.onepassword.token]
  if (args.some(arg => secretsOf.some(secret => arg.includes(secret)))) fail('A secret was passed on the command line')
  console.log(run[tools[tool]](world, args))
  if (JSON.stringify(world) !== before) await Bun.write(worldPath, JSON.stringify(world))
}
