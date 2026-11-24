import type { AppStatus, PlanModel, SignInFlow } from '@sand/accounts/contract'
import { fieldsOf, type Json, levelsOf, type Levels, pasteSignIn, RpcError, textOf } from '@sand/app-plan'
import { errorMessage } from '@sand/util'
import { homedir } from 'node:os'
import { type AcpClient, withAcp } from './acp'
import { agy, loginArgs } from './binary'

interface Choice {
  value: string
  name: string
}

interface ConfigOption {
  id: string
  category?: string
  currentValue?: string
  options: Choice[]
}

const AUTHORIZE_URL = /https:\/\/accounts\.google\.com\/o\/oauth2\/auth[^\s\x07\x1b]*/
const AUTH_ERROR_CODE = -32000
const EFFORT_IDS = ['effort', 'reasoning_effort', 'thought_level']

function isAuthError(error: unknown): boolean {
  if (error instanceof RpcError && error.code === AUTH_ERROR_CODE) return true
  return /auth|sign in|log in/i.test(errorMessage(error))
}

function choicesOf(raw: unknown): Choice[] {
  if (!Array.isArray(raw)) return []
  return raw.map(fieldsOf).flatMap(entry => {
    if (Array.isArray(entry.options)) return choicesOf(entry.options)
    const value = textOf(entry.value)
    return value ? [{ value, name: textOf(entry.name) ?? value }] : []
  })
}

function configOptions(raw: unknown): ConfigOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map(fieldsOf).flatMap(entry => {
    const id = textOf(entry.id)
    return id ? [{ id, category: textOf(entry.category), currentValue: textOf(entry.currentValue), options: choicesOf(entry.options) }] : []
  })
}

function modelOption(options: ConfigOption[]): ConfigOption | undefined {
  return options.find(option => option.category === 'model') ?? options.find(option => option.id === 'model')
}

function effortOption(options: ConfigOption[]): ConfigOption | undefined {
  return options.find(option => option.category === 'thought_level') ?? options.find(option => EFFORT_IDS.includes(option.id))
}

function levelsIn(raw: unknown): Levels {
  const option = effortOption(configOptions(raw))
  return option ? levelsOf(option.options.map(choice => choice.value), option.currentValue) : {}
}

function planModel({ value, name }: Choice, levels: Levels): PlanModel {
  return { name: value, label: name, ...levels, images: true }
}

async function configuredModels(client: AcpClient, sessionId: string, option: ConfigOption): Promise<PlanModel[]> {
  const models: PlanModel[] = []
  for (const choice of option.options) {
    const chosen = await client.request('session/set_config_option', { sessionId, configId: option.id, value: choice.value })
    models.push(planModel(choice, levelsIn(chosen.configOptions)))
  }
  return models
}

function listedModels(session: Json): PlanModel[] {
  const levels = levelsIn(session.configOptions)
  const available = fieldsOf(session.models).availableModels
  if (!Array.isArray(available)) return []
  return available.map(fieldsOf).flatMap(entry => {
    const id = textOf(entry.modelId) ?? textOf(entry.id)
    return id ? [planModel({ value: id, name: textOf(entry.name) ?? id }, levels)] : []
  })
}

function tierOf(created: Json): string | undefined {
  return textOf(fieldsOf(fieldsOf(fieldsOf(created._meta).antigravity).tier).name)
}

async function withSession<T>(folder: string | undefined, run: (client: AcpClient, sessionId: string, created: Json) => Promise<T>): Promise<T> {
  return withAcp(folder, async client => {
    const created = await client.request('session/new', { cwd: folder ?? homedir(), mcpServers: [] })
    const sessionId = textOf(created.sessionId)
    if (!sessionId) throw new Error('Antigravity did not return a session ID')
    try {
      return await run(client, sessionId, created)
    } finally {
      await client.request('session/close', { sessionId }).catch(() => {})
    }
  })
}

async function readStatus(folder?: string): Promise<AppStatus> {
  try {
    const plan = await withSession(folder, async (_client, _sessionId, created) => tierOf(created))
    return { installed: true, signedIn: true, ...(plan && { plan }) }
  } catch (error) {
    if (isAuthError(error)) return { installed: true, signedIn: false }
    return { installed: true, signedIn: false, problem: errorMessage(error) }
  }
}

async function signIn(signal: AbortSignal, folder?: string): Promise<SignInFlow<void>> {
  return pasteSignIn({
    app: agy.app,
    command: [await agy.require(), ...loginArgs(folder)],
    env: process.env,
    link: AUTHORIZE_URL,
    signal,
    signedIn: async () => (await readStatus(folder)).signedIn,
  })
}

async function signOut(folder?: string): Promise<void> {
  await withAcp(folder, client => client.request('logout', {}).catch(() => {}))
}

async function listModels(folder?: string): Promise<PlanModel[]> {
  return withSession(folder, (client, sessionId, created) => {
    const option = modelOption(configOptions(created.configOptions))
    return option?.options.length ? configuredModels(client, sessionId, option) : Promise.resolve(listedModels(created))
  })
}

export { configOptions, effortOption, listModels, modelOption, readStatus, signIn, signOut }
