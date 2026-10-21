import type { PlanModel } from '../contract'
import type { Accounts } from '../auth/accounts'
import type { PlanRegistry } from '../auth/plans'
import { discoverAnthropic, discoverOpenAI, discoverOpenRouter, discoverServer } from '../discover'
import type { SourceMeta } from './types'

const keyOf = async (accounts: Accounts, id: string) => {
  const credential = await accounts.auth(id)
  if (credential.type !== 'api_key') throw new Error(`${accounts.label(id)} has no API key`)
  return credential
}

const discoverPlan = async (accounts: Accounts, plans: PlanRegistry, meta: SourceMeta) => {
  const app = plans.app(meta.id)
  if (app) return app.models()
  const plan = plans.api(meta.id)
  const credential = await accounts.auth(meta.id)
  if (!plan || credential.type !== 'oauth') throw new Error(`${meta.label} needs a sign-in`)
  return plan.models(credential)
}

export const discover = async (accounts: Accounts, plans: PlanRegistry, meta: SourceMeta): Promise<PlanModel[]> => {
  switch (meta.kind) {
    case 'anthropic':
      return discoverAnthropic(await keyOf(accounts, meta.id))
    case 'openai':
      return discoverOpenAI(await keyOf(accounts, meta.id))
    case 'openrouter':
      return discoverOpenRouter((await keyOf(accounts, meta.id)).key)
    case 'server': {
      const server = accounts.server(meta.id)
      if (!server) throw new Error(`${meta.label} was removed`)
      return discoverServer(server.url, server.key)
    }
    default:
      return discoverPlan(accounts, plans, meta)
  }
}
