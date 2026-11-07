import { oneLine } from '@sand/util'
import type { z } from 'zod'
import type { LoginKind, LoginValues, SignIn, SourceItem } from '../contract'

export interface Ref {
  item: string
  vault?: string
  account?: string
}

export interface Cli {
  connected: boolean
  text(args: string[], env?: Record<string, string>): Promise<string>
  json<T>(schema: z.ZodType<T>, args: string[], env?: Record<string, string>): Promise<T>
}

export interface Source {
  label: string
  command: string
  credential: string
  needs?: string
  kinds: LoginKind[]
  errors: [RegExp, string][]
  status(cli: Cli): Promise<SignIn>
  connect(cli: Cli, secret: string): Promise<string>
  disconnect?(cli: Cli): Promise<unknown>
  sync?(cli: Cli): Promise<unknown>
  search(cli: Cli): Promise<SourceItem[]>
  item(cli: Cli, ref: Ref): Promise<SourceItem>
  values(cli: Cli, ref: Ref, kind: LoginKind): Promise<LoginValues>
  code?(cli: Cli, ref: Ref): Promise<string>
}

const timeout = 2 * 60_000
const shownChars = 200

const scrubbed = (text: string, secrets: string[]) => secrets.reduce((out, value) => out.split(value).join('[secret]'), text)

const jsonOf = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export const lacks = (label: string, what: string) => new Error(`That ${label} item has no ${what}`)

export const cliOf = (source: Source, path: string, credential: string | undefined, redact: (text: string) => string): Cli => {
  const text = async (args: string[], extra: Record<string, string> = {}) => {
    const found = Bun.which(path)
    if (!found) throw new Error(`${source.label} needs its ${source.command} CLI: install it, or set ${source.command} in [plugins.logins] in sand.toml to its path`)
    const secrets = { ...(credential && { [source.credential]: credential }), ...extra }
    const env = { ...Bun.env }
    delete env[source.credential]
    const child = Bun.spawn([found, ...args], { env: { ...env, ...secrets }, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', timeout })
    const [out, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    if (code === 0) return out
    if (child.signalCode) throw new Error(`${source.label} didn't answer within 2 minutes`)
    const said = scrubbed(error.trim() || out.trim(), Object.values(secrets))
    const known = source.errors.find(([pattern]) => pattern.test(said))?.[1]
    throw new Error(known ?? `${source.label}: ${redact(oneLine(said, shownChars)) || `${source.command} failed with exit code ${code}`}`)
  }

  const json = async <T>(schema: z.ZodType<T>, args: string[], extra?: Record<string, string>) => {
    const found = schema.safeParse(jsonOf(await text(args, extra)))
    if (!found.success) throw new Error(`${source.label} gave an answer sand can't read: update its ${source.command} CLI`)
    return found.data
  }

  return { connected: Boolean(credential), text, json }
}
