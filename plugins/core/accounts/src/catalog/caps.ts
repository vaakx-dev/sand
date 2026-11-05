import { type LoginMethod, type PlanApi, type ProviderCapabilities, statelessCaps } from '../contract'

const minutes = 60_000

const byMethod: Partial<Record<LoginMethod, ProviderCapabilities>> = {
  app: statelessCaps(),
  server: statelessCaps(['effort']),
}

const byApi: Record<PlanApi, ProviderCapabilities> = {
  anthropic: statelessCaps(['effort', 'speed'], 5 * minutes),
  openai: statelessCaps(['effort', 'speed'], 10 * minutes),
}

const compat = statelessCaps(['effort'], 5 * minutes)

export const capsOf = (method: LoginMethod, api?: PlanApi) => byMethod[method] ?? (api ? byApi[api] : compat)
