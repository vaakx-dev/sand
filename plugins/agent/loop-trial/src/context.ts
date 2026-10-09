import type {} from '@sand/loops/contract'
import type {} from '@sand/paths/contract'
import type { Context } from 'drydock'

export type TrialContext = Context<'cli' | 'loops' | 'paths' | 'sessions' | 'tools'>
