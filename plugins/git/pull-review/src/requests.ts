import type { GitHub, PullRef } from '@sand/github/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { type AgentReviewDeps, startAgentReview } from './agent/start'
import {
  reviewAgentComments,
  reviewComment,
  reviewDiscard,
  reviewFiles,
  reviewPatch,
  reviewPending,
  reviewRemove,
  reviewSubmit,
  reviewViewed,
  reviewWithAgent,
} from './contract'
import { readFiles } from './files/files'
import { markViewed } from './files/mark'
import { type PatchDeps, readPatch } from './files/patch'
import type { AgentRecord } from './pending/agent-record'
import type { Reviews } from './pending/reviews'
import type { PullNodes } from './pull/node'

export interface RequestDeps {
  github: GitHub
  nodes: PullNodes
  reviews: Reviews
  record: AgentRecord
  patch: PatchDeps
  agent: AgentReviewDeps
  changed(ref: PullRef): void
}

export const serveReview = (server: Server, deps: RequestDeps) =>
  joinDisposers(
    server.handle(reviewFiles, source => readFiles(deps.github, deps.nodes, source)),
    server.handle(reviewPatch, ({ path, ...source }) => readPatch(deps.patch, source, path)),
    server.handle(reviewViewed, async ({ path, viewed, ...ref }) => {
      await markViewed(deps.github, deps.nodes, ref, path, viewed)
      deps.changed(ref)
    }),
    server.handle(reviewPending, ref => deps.reviews.pending(ref)),
    server.handle(reviewComment, ({ repo, number, ...comment }) => deps.reviews.comment({ repo, number }, comment)),
    server.handle(reviewRemove, ({ comment, ...ref }) => deps.reviews.remove(ref, comment)),
    server.handle(reviewSubmit, ({ event, body, ...ref }) => deps.reviews.submit(ref, { event, body })),
    server.handle(reviewDiscard, ref => deps.reviews.discard(ref)),
    server.handle(reviewWithAgent, request => startAgentReview(deps.agent, request)),
    server.handle(reviewAgentComments, async ref => [...(await deps.record.ids(ref))]),
  )
