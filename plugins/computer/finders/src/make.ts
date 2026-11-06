import type { Finders } from './contract'
import { elementFinder, llmFinder, type Services } from './providers/llm'
import { withStrategy } from './strategies'

const providers = { llm: llmFinder, element: elementFinder }

export const createFinders = (services: Services): Finders => ({
  make: (finder, strategy) => withStrategy(providers[finder.kind](services, finder), strategy),
})
