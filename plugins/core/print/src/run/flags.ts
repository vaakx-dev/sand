import type { CliFlags } from '@sand/config/contract'
import { parseArgs } from 'node:util'

const options = {
  model: { type: 'string' },
  effort: { type: 'string' },
  fast: { type: 'boolean' },
} as const

export const readFlags = (args: string[]): CliFlags => parseArgs({ args, options }).values
