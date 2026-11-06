import type { Located } from '../contract'

export const spent = (rounds: Located[]) => ({
  usage: {
    inputTokens: rounds.reduce((sum, round) => sum + round.usage.inputTokens, 0),
    outputTokens: rounds.reduce((sum, round) => sum + round.usage.outputTokens, 0),
  },
  costUsd: rounds.reduce((sum, round) => sum + round.costUsd, 0),
})
