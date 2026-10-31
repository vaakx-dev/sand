import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'
import type { GitBranches, GitLocal, GitRemote, GitStatus } from './status'

const cwdInput = z.object({ cwd: z.string() })

export const gitStatus = request('git.status', { input: cwdInput, output: type<GitStatus>(), place: 'thread' })
export const gitWatch = request('git.watch', { input: cwdInput, output: type<GitStatus>(), place: 'thread' })
export const gitBranches = request('git.branches', {
  input: z.object({ cwd: z.string(), query: z.string().optional(), limit: z.number().int().positive().optional() }),
  output: type<GitBranches>(),
  place: 'thread',
})

export const gitLocalChange = wireEvent<{ cwd: string; local: GitLocal }>('git.local')
export const gitRemoteChange = wireEvent<{ cwd: string; remote: GitRemote }>('git.remote')
