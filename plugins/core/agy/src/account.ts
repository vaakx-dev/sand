import { efforts, type AppStatus, type Effort, type PlanModel, type SignInFlow } from '@sand/accounts/contract'
import { homedir } from 'node:os'
import { errorMessage, fieldsOf, RpcError, withAcp, type AcpClient, type Json } from './acp'
import { findBinary, loginArgs, requireBinary } from './binary'

const AUTHORIZE_URL = /https:\/\/accounts\.google\.com\/o\/oauth2\/auth[^\s\x07\x1b]*/
const LOGIN_START_TIMEOUT_MS = 20_000
const NO_BROWSER = 'none'
const AUTH_ERROR_CODE = -32000

interface ConfigOptionChoice {
  value: string
  name: string
}

interface ParsedConfigOption {
  id: string
  category?: string
  currentValue?: string
  options: ConfigOptionChoice[]
}

interface EffortLevels {
  supported: Effort[]
  defaultEffort?: Effort
}

interface ModelChoice {
  sessionId: string
  configId: string
  model: string
}

function isAuthError(error: unknown): boolean {
  if (error instanceof RpcError && error.code === AUTH_ERROR_CODE) return true
  return /auth|sign in|log in/i.test(errorMessage(error))
}

function parseChoices(raw: unknown): ConfigOptionChoice[] {
  if (!Array.isArray(raw)) return []
  const choices: ConfigOptionChoice[] = []
  for (const item of raw) {
    const entry = fieldsOf(item)
    if (Array.isArray(entry.options)) {
      choices.push(...parseChoices(entry.options))
      continue
    }
    const value = typeof entry.value === 'string' ? entry.value : ''
    if (!value) continue
    const name = typeof entry.name === 'string' && entry.name ? entry.name : value
    choices.push({ value, name })
  }
  return choices
}

function parseConfigOptions(raw: unknown): ParsedConfigOption[] {
  if (!Array.isArray(raw)) return []
  const parsed: ParsedConfigOption[] = []
  for (const item of raw) {
    const entry = fieldsOf(item)
    const id = typeof entry.id === 'string' ? entry.id : ''
    if (!id) continue
    const category = typeof entry.category === 'string' ? entry.category : undefined
    const currentValue = typeof entry.currentValue === 'string' ? entry.currentValue : undefined
    parsed.push({ id, category, currentValue, options: parseChoices(entry.options) })
  }
  return parsed
}

function findModelOption(options: ParsedConfigOption[]): ParsedConfigOption | undefined {
  return options.find(option => option.category === 'model') ?? options.find(option => option.id === 'model')
}

function findEffortOption(options: ParsedConfigOption[]): ParsedConfigOption | undefined {
  return (
    options.find(option => option.category === 'thought_level') ??
    options.find(option => option.id === 'effort' || option.id === 'reasoning_effort' || option.id === 'thought_level')
  )
}

function effortLevelsFrom(configOptions: unknown): EffortLevels {
  const option = findEffortOption(parseConfigOptions(configOptions))
  if (!option) return { supported: [] }
  const values = new Set(option.options.map(choice => choice.value.toLowerCase()))
  const supported = efforts.filter(level => values.has(level))
  const current = option.currentValue?.toLowerCase()
  const defaultEffort = supported.find(level => level === current)
  return { supported, defaultEffort }
}

function planModel({ value, name }: ConfigOptionChoice, { supported, defaultEffort }: EffortLevels): PlanModel {
  return {
    name: value,
    label: name,
    ...(supported.length > 0 && { efforts: supported }),
    ...(defaultEffort && { defaultEffort }),
    images: true,
  }
}

async function effortLevelsOf(client: AcpClient, { sessionId, configId, model }: ModelChoice): Promise<EffortLevels> {
  const chosen = await client.request('session/set_config_option', { sessionId, configId, value: model })
  return effortLevelsFrom(chosen.configOptions)
}

async function configuredModels(client: AcpClient, sessionId: string, modelOption: ParsedConfigOption): Promise<PlanModel[]> {
  const models: PlanModel[] = []
  for (const choice of modelOption.options) {
    const levels = await effortLevelsOf(client, { sessionId, configId: modelOption.id, model: choice.value })
    models.push(planModel(choice, levels))
  }
  return models
}

function legacyModels(session: Json): PlanModel[] {
  const levels = effortLevelsFrom(session.configOptions)
  const available = fieldsOf(session.models).availableModels
  if (!Array.isArray(available)) return []
  return available.flatMap(item => {
    const entry = fieldsOf(item)
    const id = typeof entry.modelId === 'string' ? entry.modelId : typeof entry.id === 'string' ? entry.id : ''
    if (!id) return []
    const label = typeof entry.name === 'string' && entry.name ? entry.name : id
    return [planModel({ value: id, name: label }, levels)]
  })
}

async function modelsFromSession(client: AcpClient, sessionId: string, session: Json): Promise<PlanModel[]> {
  const modelOption = findModelOption(parseConfigOptions(session.configOptions))
  return modelOption?.options.length ? configuredModels(client, sessionId, modelOption) : legacyModels(session)
}

function tierNameOf(created: Json): string | undefined {
  const name = fieldsOf(fieldsOf(fieldsOf(created._meta).antigravity).tier).name
  return typeof name === 'string' && name ? name : undefined
}

async function readStatus(folder?: string): Promise<AppStatus> {
  if (!(await findBinary())) return { installed: false, signedIn: false }
  try {
    const plan = await withAcp(folder, async client => {
      const created = await client.request('session/new', { cwd: folder ?? homedir(), mcpServers: [] })
      const sessionId = typeof created.sessionId === 'string' ? created.sessionId : undefined
      if (sessionId) await client.request('session/close', { sessionId }).catch(() => {})
      return tierNameOf(created)
    })
    return { installed: true, signedIn: true, plan }
  } catch (error) {
    if (isAuthError(error)) return { installed: true, signedIn: false }
    return { installed: true, signedIn: false, problem: errorMessage(error) }
  }
}

async function watchStream(stream: ReadableStream<Uint8Array>, onText: (accumulated: string) => void) {
  const decoder = new TextDecoder()
  let accumulated = ''
  for await (const chunk of stream) {
    accumulated += decoder.decode(chunk, { stream: true })
    onText(accumulated)
  }
}

async function signInAgy(signal: AbortSignal, folder?: string): Promise<SignInFlow<void>> {
  const binary = await requireBinary()
  const child = Bun.spawn([binary, ...loginArgs(folder)], {
    env: { ...process.env, BROWSER: NO_BROWSER },
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })
  signal.addEventListener('abort', () => child.kill(), { once: true })

  const shown = Promise.withResolvers<string>()
  const inspect = (text: string) => {
    const match = AUTHORIZE_URL.exec(text)
    if (match) shown.resolve(match[0])
  }
  void watchStream(child.stdout, inspect)
  void watchStream(child.stderr, inspect)

  const finished = child.exited.then(async code => {
    if ((await readStatus(folder)).signedIn) return
    throw new Error(code ? `Antigravity sign-in stopped (exit ${code})` : "Antigravity didn't finish signing in")
  })
  finished.catch(() => {})

  const timeout = setTimeout(() => shown.reject(new Error("Antigravity didn't show a sign-in link")), LOGIN_START_TIMEOUT_MS)
  const url = await shown.promise
    .catch(error => {
      child.kill()
      throw error
    })
    .finally(() => clearTimeout(timeout))

  return {
    kind: 'paste',
    url,
    async finish(code: string) {
      child.stdin.write(`${code.trim()}\n`)
      await child.stdin.flush()
      await finished
    },
    wait: () => finished,
  }
}

async function signOutAgy(folder?: string): Promise<void> {
  if (!(await findBinary())) return
  await withAcp(folder, async client => {
    await client.request('logout', {}).catch(() => {})
  })
}

async function listModels(folder?: string): Promise<PlanModel[]> {
  return withAcp(folder, async client => {
    const created = await client.request('session/new', { cwd: folder ?? homedir(), mcpServers: [] })
    const sessionId = typeof created.sessionId === 'string' ? created.sessionId : ''
    if (!sessionId) throw new Error('Antigravity did not return a session ID')
    const models = await modelsFromSession(client, sessionId, created)
    await client.request('session/close', { sessionId }).catch(() => {})
    return models
  })
}

export { findEffortOption, findModelOption, listModels, parseConfigOptions, readStatus, signInAgy, signOutAgy }
