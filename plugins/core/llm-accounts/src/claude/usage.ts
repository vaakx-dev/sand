import type { Limits, LimitWindow } from '../contract'
import { send } from '../http/send'
import { reaching } from '../reach'

const url = 'https://api.anthropic.com/api/oauth/usage'
const hour = 3_600_000

const groups: Record<string, { label: string; duration: number }> = {
  session: { label: '5-hour', duration: 5 * hour },
  weekly: { label: 'Weekly', duration: 7 * 24 * hour },
}

interface UsageLimit {
  kind: string
  group: string
  percent: number
  severity: string
  resets_at: string | null
  scope: { model: { display_name: string | null } | null } | null
}

const statusOf = ({ percent, severity }: UsageLimit) => {
  if (percent >= 100) return 'rejected'
  if (severity !== 'normal') return 'allowed_warning'
  return undefined
}

const windowOf = (limit: UsageLimit): LimitWindow => {
  const group = groups[limit.group]
  const base = group?.label ?? limit.group
  const model = limit.scope?.model?.display_name
  const resetsAt = limit.resets_at ? Date.parse(limit.resets_at) : undefined
  const status = statusOf(limit)
  return {
    id: model ? `${limit.kind}-${model}` : limit.kind,
    label: model ? `${base} · ${model}` : base,
    used: Math.min(1, limit.percent / 100),
    ...(resetsAt && { resetsAt }),
    ...(group && { duration: group.duration }),
    ...(status && { status }),
  }
}

export const fetchClaudeLimits = (access: string, name: string, retries: number): Promise<Limits> =>
  reaching(url, name, undefined, async () => {
    const headers = { authorization: `Bearer ${access}`, 'anthropic-beta': 'oauth-2025-04-20' }
    const response = await send(url, { headers }, { retries })
    const { limits } = (await response.json()) as { limits: UsageLimit[] }
    return { source: 'claude', windows: limits.map(windowOf), updated: Date.now() }
  })
