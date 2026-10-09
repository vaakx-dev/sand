import type { EffortLevel, LLM, LLMEvent, LLMRequest, Limits, LoginProvider, ModelInfo } from '@sand/protocol'
import { providers, signInError, subscriptions, type Accounts } from './auth/accounts'
import { describeClaude } from './claude/models'
import { describeCodex } from './codex/models'
import type { AccountsConfig } from './config'

export const levels: EffortLevel[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'xhigh', label: 'Extra high' },
  { id: 'max', label: 'Max' },
]

type Stream = (request: LLMRequest, signal?: AbortSignal) => AsyncIterable<LLMEvent>

export interface Routes {
  accounts: Accounts
  config: AccountsConfig
  claude: { stream: Stream; probe(): Promise<void> }
  codex: { stream: Stream }
  limits(): Limits | undefined
}

export type LocalLLM = Required<LLM> & { owner(id: string): LoginProvider }

export const createLocal = ({ accounts, config, claude, codex, limits }: Routes): LocalLLM => {
  const catalog: Record<LoginProvider, () => ModelInfo[]> = {
    anthropic: () => config.claude_models.map(describeClaude),
    openai: () => config.codex_models.map(describeCodex),
  }
  const streams: Record<LoginProvider, Stream> = { anthropic: claude.stream, openai: codex.stream }

  const models = () => {
    const seen = new Set<string>()
    return providers
      .filter(accounts.signedIn)
      .flatMap(provider => catalog[provider]())
      .filter(model => !seen.has(model.id) && !!seen.add(model.id))
  }

  const owner = (id: string): LoginProvider => {
    const found = models().find(model => model.id === id)?.provider
    if (found === 'anthropic' || found === 'openai') return found
    return config.codex_models.includes(id) || /^(gpt-|codex|o\d)/.test(id) ? 'openai' : 'anthropic'
  }

  const oauth = () => providers.filter(provider => accounts.credential(provider)?.type === 'oauth')

  const plans = () =>
    oauth().map(provider => {
      const credential = accounts.credential(provider)
      return `${subscriptions[provider]} ${credential?.type === 'oauth' ? (credential.plan ?? '') : ''}`.trim()
    })

  return {
    models,
    owner,
    levels: () => levels,
    async *stream(request, signal) {
      await accounts.ready
      const model = request.model ?? models()[0]?.id
      if (!model || !providers.some(accounts.signedIn)) throw signInError()
      yield* streams[owner(model)]({ ...request, model }, signal)
    },
    provider: () => {
      const plan = plans().join(' · ')
      return { id: 'accounts', label: 'Accounts', billing: oauth().length ? 'plan' : 'api', ...(plan && { plan }) }
    },
    limits,
    price: () => undefined,
    async refreshLimits() {
      await accounts.ready
      if (accounts.signedIn('anthropic')) await claude.probe()
      return limits()
    },
  }
}
