import { service } from 'drydock'

export type PullState = 'open' | 'draft' | 'merged' | 'closed'

export interface GitHub {
  rest<T>(method: string, path: string, body?: unknown): Promise<T>
}

export const github = service<GitHub>('github')
