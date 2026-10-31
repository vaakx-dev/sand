import { type GitHub, type PullRef, pullVariables } from '@sand/github/contract'
import { present } from './nodes'
import { commentFields, pageQuery, reviewFields, threadFields } from './query'
import type { Connection, PageData, RawComment, RawDetail, RawReview, RawThread } from './raw'

const mostPages = 5

const commentPages = pageQuery('comments', commentFields)
const reviewPages = pageQuery('reviews', reviewFields)
const threadPages = pageQuery('reviewThreads', threadFields)

const allPages = async <T>(github: GitHub, ref: PullRef, query: string, first: Connection<T> | null): Promise<T[]> => {
  const items = present(first?.nodes)
  let info = first?.pageInfo
  for (let page = 1; page < mostPages && info?.hasNextPage && info.endCursor; page++) {
    const data = await github.graphql<PageData<T>>(query, { ...pullVariables(ref), after: info.endCursor })
    const next = data.repository?.pullRequest?.page
    if (!next) break
    items.push(...present(next.nodes))
    info = next.pageInfo
  }
  return items
}

export interface PagedLists {
  comments: RawComment[]
  reviews: RawReview[]
  threads: RawThread[]
}

export const pagedLists = async (github: GitHub, ref: PullRef, node: Pick<RawDetail, 'comments' | 'reviews' | 'threads'>): Promise<PagedLists> => {
  const [comments, reviews, threads] = await Promise.all([
    allPages(github, ref, commentPages, node.comments),
    allPages(github, ref, reviewPages, node.reviews),
    allPages(github, ref, threadPages, node.threads),
  ])
  return { comments, reviews, threads }
}
