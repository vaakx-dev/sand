import type { PullSummary } from '@sand/github/contract'
import { allowedMethods } from '@sand/github/summary'
import type { PullCommit, PullDetail } from '../contract'
import { conversationOf } from './conversation'
import { present } from './nodes'
import type { PagedLists } from './pages'
import type { RawDetail, RawRepo } from './raw'
import { requestedOf, reviewersOf } from './reviewers'

export interface DetailParts {
  summary: PullSummary
  node: RawDetail
  repo: RawRepo
  viewer: string
  lists: PagedLists
  behindBy?: number
}

const writers = new Set(['ADMIN', 'MAINTAIN', 'WRITE'])

const commitsOf = (node: RawDetail): PullCommit[] =>
  present(node.commitList.nodes).map(({ commit }) => ({
    sha: commit.oid,
    subject: commit.messageHeadline,
    author: commit.author?.user?.login ?? commit.author?.name ?? 'unknown',
    at: Date.parse(commit.authoredDate),
  }))

export const shapeDetail = ({ summary, node, repo, viewer, lists, behindBy }: DetailParts): PullDetail => ({
  ...summary,
  body: node.body,
  labels: present(node.labels?.nodes).map(label => label.name),
  reviewers: reviewersOf(node, summary.author),
  requested: requestedOf(node),
  commits: commitsOf(node),
  conversation: conversationOf(lists),
  viewer,
  canMerge: node.viewerCanMergeAsAdmin || writers.has(repo.viewerPermission ?? ''),
  canEdit: node.viewerCanUpdate,
  methods: allowedMethods(repo),
  ...(behindBy === undefined ? {} : { behindBy }),
  headDeleted: node.headRef === null,
})
