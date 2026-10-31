import type { MergeMethod, PullRef, PullSummary } from '@sand/github/contract'
import { type InputOf, request, type, wireEvent } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

export type ReviewerState = 'approved' | 'changes' | 'commented' | 'pending' | 'dismissed'

export interface Reviewer {
  login: string
  state: ReviewerState
}

export interface PullComment {
  id: string
  author: string
  body: string
  at: number
  mine: boolean
  bot: boolean
}

export type ConversationItem =
  | ({ kind: 'comment' } & PullComment)
  | { kind: 'review'; id: string; author: string; state: ReviewerState; body: string; at: number; bot: boolean }
  | { kind: 'thread'; id: string; path: string; line?: number; resolved: boolean; outdated: boolean; hunk: string; comments: PullComment[]; at: number }

export interface PullCommit {
  sha: string
  subject: string
  author: string
  at: number
}

export interface PullDetail extends PullSummary {
  body: string
  labels: string[]
  reviewers: Reviewer[]
  requested: string[]
  commits: PullCommit[]
  conversation: ConversationItem[]
  viewer: string
  canMerge: boolean
  canEdit: boolean
  methods: MergeMethod[]
  behindBy?: number
  headDeleted: boolean
}

const ref = { repo: z.string(), number: z.number().int().positive() }

export const pullsDetail = request('pulls.detail', { input: z.object({ ...ref, fresh: z.boolean().optional() }), output: type<PullDetail>() })
export const pullsReply = request('pulls.reply', { input: z.object({ ...ref, thread: z.string().optional(), body: z.string().min(1) }), output: type<PullDetail>() })
export const pullsResolveThread = request('pulls.thread.resolve', { input: z.object({ ...ref, thread: z.string(), resolved: z.boolean() }), output: type<PullDetail>() })
export const pullsEdit = request('pulls.edit', { input: z.object({ ...ref, title: z.string().optional(), body: z.string().optional() }), output: type<PullDetail>() })
export const pullsRequestReview = request('pulls.reviewers', { input: z.object({ ...ref, add: z.array(z.string()).min(1) }), output: type<PullDetail>() })
export const pullsCandidates = request('pulls.reviewers.candidates', { input: z.object({ ...ref, q: z.string().optional() }), output: type<string[]>() })
export const pullsClose = request('pulls.close', { input: z.object({ ...ref, closed: z.boolean() }), output: type<PullDetail>() })
export const pullsUpdateBranch = request('pulls.update', { input: z.object({ ...ref, rebase: z.boolean().optional() }), output: type<PullDetail>() })
export const pullsRevert = request('pulls.revert', { input: z.object(ref), output: type<PullSummary>() })
export const pullsDeleteBranch = request('pulls.branch.delete', { input: z.object(ref), output: type<PullDetail>() })

export const pullDetailChange = wireEvent<PullRef>('pulls.detail.change')

export interface PullDetailClient {
  detail(input: InputOf<typeof pullsDetail>): Promise<PullDetail>
  reply(input: InputOf<typeof pullsReply>): Promise<PullDetail>
  resolveThread(input: InputOf<typeof pullsResolveThread>): Promise<PullDetail>
  edit(input: InputOf<typeof pullsEdit>): Promise<PullDetail>
  requestReview(input: InputOf<typeof pullsRequestReview>): Promise<PullDetail>
  candidates(input: InputOf<typeof pullsCandidates>): Promise<string[]>
  close(input: InputOf<typeof pullsClose>): Promise<PullDetail>
  updateBranch(input: InputOf<typeof pullsUpdateBranch>): Promise<PullDetail>
  revert(input: InputOf<typeof pullsRevert>): Promise<PullSummary>
  deleteBranch(input: InputOf<typeof pullsDeleteBranch>): Promise<PullDetail>
  onChange(listener: (pull: PullRef) => void): Dispose
}

export const pullDetailClient = service<PullDetailClient>('pullDetailClient')
