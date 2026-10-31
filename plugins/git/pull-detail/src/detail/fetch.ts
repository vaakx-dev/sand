import { type GitHub, isMissing, type PullRef, type PullSummary, pullVariables } from '@sand/github/contract'
import { shapeSummary } from '@sand/github/summary'
import type { PullDetail } from '../contract'
import { missingPull } from '../errors/refusal'
import { behindBase } from './behind'
import { pagedLists } from './pages'
import { detailQuery } from './query'
import type { DetailData } from './raw'
import { shapeDetail } from './shape'

export interface PullIds {
  pull: string
  headRef?: string
  headOid: string
}

export interface LoadedPull {
  detail: PullDetail
  summary: PullSummary
  ids: PullIds
}

export const fetchDetail = async (github: GitHub, ref: PullRef): Promise<LoadedPull> => {
  const data = await github.graphql<DetailData>(detailQuery, pullVariables(ref)).catch((error: unknown) => {
    throw isMissing(error) ? missingPull(ref) : error
  })
  const repo = data.repository
  const node = repo?.pullRequest
  if (!repo || !node) throw missingPull(ref)
  const summary = shapeSummary(ref, node)
  const [lists, behindBy] = await Promise.all([pagedLists(github, ref, node), behindBase(github, summary, node.headRefOid, node.headRef !== null)])
  return {
    detail: shapeDetail({ summary, node, repo, viewer: data.viewer.login, lists, ...(behindBy === undefined ? {} : { behindBy }) }),
    summary,
    ids: { pull: node.id, headOid: node.headRefOid, ...(node.headRef ? { headRef: node.headRef.id } : {}) },
  }
}
