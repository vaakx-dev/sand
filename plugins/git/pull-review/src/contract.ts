import type { DiffPatch } from '@sand/git-diff/contract'
import type { PullRef } from '@sand/github/contract'
import { type InputOf, request, type, wireEvent } from '@sand/host-hub/contract'
import { type Dispose, service } from 'drydock'
import { z } from 'zod'

export type ReviewFileKind = 'added' | 'modified' | 'deleted' | 'renamed'
export type ViewedState = 'viewed' | 'unviewed' | 'changed'
export type ReviewSide = 'LEFT' | 'RIGHT'
export type ReviewEvent = 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'

export interface ReviewFile {
  path: string
  from?: string
  kind: ReviewFileKind
  add: number
  del: number
  viewed: ViewedState
  binary?: boolean
}

export interface ReviewFiles {
  repo: string
  number: number
  head: string
  commit?: string
  files: ReviewFile[]
  viewed: number
  total: number
}

export interface PendingComment {
  id: string
  path: string
  line: number
  startLine?: number
  side: ReviewSide
  body: string
  byAgent: boolean
}

export interface PendingReview {
  id?: string
  comments: PendingComment[]
}

const ref = { repo: z.string(), number: z.number().int().positive() }
const side = z.enum(['LEFT', 'RIGHT'])

export const reviewFiles = request('pulls.review.files', { input: z.object({ ...ref, commit: z.string().optional() }), output: type<ReviewFiles>() })
export const reviewPatch = request('pulls.review.patch', {
  input: z.object({ ...ref, path: z.string(), commit: z.string().optional() }),
  output: type<DiffPatch>(),
})
export const reviewViewed = request('pulls.review.viewed', { input: z.object({ ...ref, path: z.string(), viewed: z.boolean() }), output: type<void>() })
export const reviewPending = request('pulls.review.pending', { input: z.object(ref), output: type<PendingReview>() })
export const reviewComment = request('pulls.review.comment', {
  input: z.object({ ...ref, path: z.string(), line: z.number().int().positive(), startLine: z.number().int().positive().optional(), side, body: z.string().min(1) }),
  output: type<PendingReview>(),
})
export const reviewRemove = request('pulls.review.remove', { input: z.object({ ...ref, comment: z.string() }), output: type<PendingReview>() })
export const reviewSubmit = request('pulls.review.submit', {
  input: z.object({ ...ref, event: z.enum(['COMMENT', 'APPROVE', 'REQUEST_CHANGES']), body: z.string().optional() }),
  output: type<void>(),
})
export const reviewDiscard = request('pulls.review.discard', { input: z.object(ref), output: type<void>() })
export const reviewWithAgent = request('pulls.review.agent', { input: z.object({ ...ref, cwd: z.string() }), output: type<{ session: string }>(), place: 'thread' })
export const reviewAgentComments = request('pulls.review.agentComments', { input: z.object({}), output: type<string[]>() })

export interface ReviewChange extends PullRef {
  agentComments?: string[]
}

export const reviewChange = wireEvent<ReviewChange>('pulls.review.change')

export interface PullReviewClient {
  files(input: InputOf<typeof reviewFiles>, device?: string): Promise<ReviewFiles>
  patch(input: InputOf<typeof reviewPatch>, device?: string): Promise<DiffPatch>
  viewed(input: InputOf<typeof reviewViewed>, device?: string): Promise<void>
  pending(input: PullRef, device?: string): Promise<PendingReview>
  comment(input: InputOf<typeof reviewComment>, device?: string): Promise<PendingReview>
  remove(input: InputOf<typeof reviewRemove>, device?: string): Promise<PendingReview>
  submit(input: InputOf<typeof reviewSubmit>, device?: string): Promise<void>
  discard(input: PullRef, device?: string): Promise<void>
  agent(input: InputOf<typeof reviewWithAgent>, device: string): Promise<{ session: string }>
  onChange(listener: (pull: PullRef, device: string) => void): Dispose
}

export const pullReviewClient = service<PullReviewClient>('pullReviewClient')
