import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'

const baseCarried = ['settings']

export const tailOf = async (ctx: Context, session: Session) => {
  const { entries, more } = session.page()
  const oldest = entries[0]
  const carried = more && oldest ? session.carried(oldest.id, await ctx.waterfall('session.carry', baseCarried)) : []
  return { entries, partial: true, ...(carried.length && { carried }) }
}
