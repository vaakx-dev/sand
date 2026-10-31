import { type InputOf, request, type, wireEvent } from '@sand/host-hub/contract'
import type { GitFailure } from '@sand/git/contract'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

export type GitAction = 'commit' | 'push' | 'pull' | 'switch' | 'init' | 'message'

export type GitPhase = 'message' | 'stage' | 'hooks' | 'commit' | 'push' | 'pull' | 'switch' | 'init'

export interface GitProgress {
  cwd: string
  run: string
  action: GitAction
  phase: GitPhase
  line?: string
}

export interface GitActionFailure {
  ok: false
  reason: GitFailure
  message: string
  output?: string
}

export type GitActionResult<T> = ({ ok: true } & T) | GitActionFailure

export interface Committed {
  commit: string
  subject: string
  pushed: boolean
  pushFailure?: GitActionFailure
}

export interface Pushed {
  upstream: string
  commits: number
}

export interface Pulled {
  commits: number
}

export interface Switched {
  branch: string
  created: boolean
}

const run = z.string().min(1)
const cwd = z.string()

export const gitCommit = request('git.commit', {
  input: z.object({
    cwd,
    run,
    paths: z.array(z.string()).optional(),
    message: z.string().optional(),
    push: z.boolean().optional(),
    session: z.string().optional(),
  }),
  output: type<GitActionResult<Committed>>(),
  place: 'thread',
})

export const gitMessage = request('git.message', {
  input: z.object({ cwd, run, paths: z.array(z.string()).optional(), session: z.string().optional() }),
  output: type<GitActionResult<{ message: string }>>(),
  place: 'thread',
})

export const gitPush = request('git.push', { input: z.object({ cwd, run }), output: type<GitActionResult<Pushed>>(), place: 'thread' })

export const gitPull = request('git.pull', { input: z.object({ cwd, run }), output: type<GitActionResult<Pulled>>(), place: 'thread' })

export const gitSwitch = request('git.switch', {
  input: z.object({ cwd, run, branch: z.string().min(1), create: z.boolean().optional(), from: z.string().optional() }),
  output: type<GitActionResult<Switched>>(),
  place: 'thread',
})

export const gitInit = request('git.init', { input: z.object({ cwd, run }), output: type<GitActionResult<{ branch: string }>>(), place: 'thread' })

export const gitProgress = wireEvent<GitProgress>('git.progress')

export interface GitActionsClient {
  commit(input: InputOf<typeof gitCommit>, device: string): Promise<GitActionResult<Committed>>
  message(input: InputOf<typeof gitMessage>, device: string): Promise<GitActionResult<{ message: string }>>
  push(input: InputOf<typeof gitPush>, device: string): Promise<GitActionResult<Pushed>>
  pull(input: InputOf<typeof gitPull>, device: string): Promise<GitActionResult<Pulled>>
  switch(input: InputOf<typeof gitSwitch>, device: string): Promise<GitActionResult<Switched>>
  init(input: InputOf<typeof gitInit>, device: string): Promise<GitActionResult<{ branch: string }>>
  onProgress(listener: (progress: GitProgress, device: string) => void): Dispose
}

export const gitActionsClient = service<GitActionsClient>('gitActionsClient')
