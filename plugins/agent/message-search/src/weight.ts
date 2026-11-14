import { DAY_MS } from '@sand/util'

export interface Strength {
  whole: boolean
  distinct: number
  at: number
}

const MOST_DISTINCT = 5
const WHOLE_WORDS = 0.5
const RECENCY = 2
const RECENT_HALF_LIFE_MS = 3 * DAY_MS

const distinctWeight = (distinct: number) => Math.log2(1 + Math.min(distinct, MOST_DISTINCT))

const recencyWeight = (at: number) => RECENCY * 0.5 ** (Math.max(0, Date.now() - at) / RECENT_HALF_LIFE_MS)

const weightOf = ({ whole, distinct, at }: Strength) => distinctWeight(distinct) + (whole ? WHOLE_WORDS : 0) + recencyWeight(at)

export { weightOf }
