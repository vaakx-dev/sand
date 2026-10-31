import type { GitHub, MergeMethod, PullSummary } from '@sand/github/contract'
import { allowedMethods, shapeSummary } from '@sand/github/summary'
import { type SearchData, type SearchNode, searchQuery } from './query'

const pageSize = 50

export interface Source {
  search: string
  requested: boolean
}

export interface Found {
  summary: PullSummary
  labels: string[]
  methods: MergeMethod[]
  mine: boolean
  requested: boolean
}

export interface FoundPage {
  found: Found[]
  cursor?: string
}

const isPull = (node: Partial<SearchNode> | null): node is SearchNode => typeof node?.number === 'number'

const labelsOf = (node: SearchNode) => (node.labels?.nodes ?? []).flatMap(label => (label ? [label.name] : []))

const sameLogin = (a: string | undefined, b: string) => a?.toLowerCase() === b.toLowerCase()

const asksViewer = (node: SearchNode, viewer: string) => (node.reviewRequests?.nodes ?? []).some(request => sameLogin(request?.requestedReviewer?.login, viewer))

const foundOf = (node: SearchNode, source: Source, viewer: string): Found => {
  const summary = shapeSummary({ repo: node.repository.nameWithOwner, number: node.number }, node)
  return {
    summary,
    labels: labelsOf(node),
    methods: allowedMethods(node.repository),
    mine: sameLogin(summary.author, viewer),
    requested: source.requested || asksViewer(node, viewer),
  }
}

export const searchPage = async (github: GitHub, source: Source, viewer: string, after?: string): Promise<FoundPage> => {
  const data = await github.graphql<SearchData>(searchQuery, { search: source.search, first: pageSize, after: after ?? null })
  const found = (data.search.nodes ?? []).filter(isPull).map(node => foundOf(node, source, viewer))
  const { hasNextPage, endCursor } = data.search.pageInfo
  return hasNextPage && endCursor ? { found, cursor: endCursor } : { found }
}
