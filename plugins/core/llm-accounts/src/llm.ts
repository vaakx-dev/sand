import type { LLM, LoginProvider, ModelInfo, ProviderInfo } from '@sand/protocol'
import { providers, subscriptions, type Accounts } from './auth/accounts'
import type { LocalLLM } from './local'
import type { Peers } from './peers/peers'

export const lacking = (accounts: Accounts) => providers.filter(provider => !accounts.signedIn(provider))

export const mergeLLM = (local: LocalLLM, peers: Peers, accounts: Accounts): LLM => {
  const remoteModels = (): ModelInfo[] =>
    lacking(accounts).flatMap(provider => {
      const peer = peers.source(provider)
      const models = peer?.info?.models.filter(model => model.provider === provider) ?? []
      return models.map(model => ({ ...model, via: peer!.pc.name }))
    })

  const models = () => [...local.models(), ...remoteModels()]

  const providerOf = (model?: string): LoginProvider | undefined => {
    const id = model ?? models()[0]?.id
    return id ? local.owner(id) : lacking(accounts).find(peers.serves)
  }

  const remote = (model?: string) => {
    const provider = providerOf(model)
    return provider && !accounts.signedIn(provider) && peers.serves(provider) ? provider : undefined
  }

  const remoteProvider = (provider: LoginProvider): ProviderInfo => {
    const peer = peers.source(provider)
    const account = peer && peers.account(peer, provider)
    const plan = account?.method === 'oauth' ? `${subscriptions[provider]} ${account.plan ?? ''}`.trim() : undefined
    return { id: 'accounts', label: peer ? `Accounts on ${peer.pc.name}` : 'Accounts', billing: account?.method === 'oauth' ? 'plan' : 'api', ...(plan && { plan }) }
  }

  return {
    models,
    levels: () => local.levels(),
    async *stream(request, signal) {
      await Promise.all([accounts.ready, peers.ready])
      const provider = remote(request.model)
      if (provider) yield* peers.stream(provider, { ...request, model: request.model ?? models()[0]?.id }, signal)
      else yield* local.stream(request, signal)
    },
    provider: model => {
      const provider = remote(model)
      return provider ? remoteProvider(provider) : local.provider()
    },
    limits: () => (accounts.signedIn('anthropic') ? local.limits() : peers.limits()),
    refreshLimits: async () => {
      if (accounts.signedIn('anthropic')) return local.refreshLimits()
      await peers.refresh(true)
      return peers.limits()
    },
    price: model => local.price(model) ?? peers.price(model),
  }
}
