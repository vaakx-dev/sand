import { llm, type LLM, type ModelInfo, unavailable, windowsBySource } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { turns } from '@sand/turns-contract/contract'
import { accountKey, day, historyWeeks, type History, startOfHour, usageReader } from '@sand/usage/contract'
import { definePlugin } from 'drydock'
import { accountPool, type Placement } from './contract'
import { planAccounts } from './plan'

const HISTORY_TTL = 10 * 60_000

const MOVED_OFF = new Set(['limited', 'moved'])

export default definePlugin({
  name: 'account-pool',
  description: 'Runs each plan model on the pool of accounts signed in to that plan: a chat starts on the account that would otherwise waste the most usage at its pace, stays there for its cache, and moves on when that account runs out',
  apply(ctx) {
    let kept: { at: number; history: History } | undefined

    const history = (now: number) => {
      if (kept && now - kept.at < HISTORY_TTL) return kept.history
      const reader = ctx.get(usageReader)
      if (!reader) return undefined
      const since = startOfHour(now) - historyWeeks * 7 * day
      const summary = reader.summary({ since, bucket: 'hour', zone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      kept = { at: now, history: { since, periods: summary.periods } }
      return kept.history
    }

    const usable = (models: LLM, members: ModelInfo[], except?: string) => {
      const out = unavailable(models)
      return members.filter(member => member.source && member.source !== except && !out.has(member.source))
    }

    const best = (models: LLM, members: ModelInfo[]) => {
      const now = Date.now()
      const windows = windowsBySource(models, now)
      const accounts = new Map((models.accounts?.() ?? []).map(account => [account.id, account]))
      const keyOf = (source: string) => {
        const found = accounts.get(source)
        return accountKey({ source: found?.account ?? source, ...(found?.pc && { pc: found.pc }) })
      }
      const candidates = members.flatMap(({ source }) => (source ? [{ source, key: keyOf(source), windows: windows.get(source) ?? [] }] : []))
      return planAccounts(candidates, history(now), now)[0]?.source
    }

    const latest = (session: Session) => ctx.get(turns)?.list(session, undefined, 1)[0]

    ctx.provide(accountPool, {
      source(session, model) {
        const models = ctx.get(llm)
        const members = models?.members?.(model) ?? []
        if (!models || !members.length) return undefined
        const last = latest(session)
        const left = last?.stopReason && MOVED_OFF.has(last.stopReason) ? last.selection.source : undefined
        const open = usable(models, members, left)
        const staying = last && !left && open.find(member => member.source === last.selection.source)
        return staying ? staying.source : (best(models, open) ?? members[0]?.source)
      },
      spare({ model, source }: Placement) {
        const models = ctx.get(llm)
        return !!models && usable(models, models.members?.(model) ?? [], source).length > 0
      },
    })
  },
})
