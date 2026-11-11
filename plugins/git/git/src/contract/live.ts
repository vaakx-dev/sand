import { service } from 'drydock'
import type { GitStatus } from './status'

export interface GitLive {
  status(device: string, cwd: string): GitStatus | undefined
}

export const gitLive = service<GitLive>('gitLive')
