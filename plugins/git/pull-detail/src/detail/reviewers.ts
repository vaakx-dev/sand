import type { Reviewer } from '../contract'
import { present } from './nodes'
import type { RawDetail, RawRequested } from './raw'
import { reviewerState } from './review-state'

export const reviewersOf = (node: RawDetail, author: string): Reviewer[] => {
  const byLogin = new Map<string, Reviewer>()
  const latest = [...present(node.latestReviews?.nodes), ...present(node.latestOpinionatedReviews?.nodes)]
  for (const review of latest) {
    const login = review.author?.login
    const state = reviewerState(review.state)
    if (!login || !state || login === author) continue
    byLogin.set(login, { login, state })
  }
  return [...byLogin.values()]
}

const requestedName = (reviewer: RawRequested) => (reviewer.__typename === 'Team' ? reviewer.combinedSlug : reviewer.login)

export const requestedOf = (node: RawDetail): string[] =>
  present(node.reviewRequests?.nodes)
    .map(request => request.requestedReviewer)
    .filter((reviewer): reviewer is RawRequested => reviewer !== null)
    .map(requestedName)
