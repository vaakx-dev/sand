import { dollars } from '@sand/util'
import type { UsageTotals } from '.'

export const usageCost = (totals: UsageTotals) => (totals.turns && totals.unpriced === totals.turns ? '—' : dollars(totals.cost))
