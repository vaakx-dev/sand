import type { JobAsk } from '@sand/bots/contract'
import type { Parts } from '../parts'

interface JobsParts {
  parts: Parts
  bot: string
  answer(ask: JobAsk): void
  reveal(entry: string): void
}

export type { JobsParts }
