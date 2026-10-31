import type { PullDetail } from '../contract'
import type { Action } from './action'
import { isOpen, stateNote } from './state'

export interface ReviewInput {
  add: string[]
}

const cleaned = (name: string) => name.trim().replace(/^@/, '')

const newcomers = (detail: PullDetail, add: string[]) => {
  const known = new Set(detail.requested.map(name => name.toLowerCase()))
  return [...new Set(add.map(cleaned).filter(Boolean))].filter(name => !known.has(name.toLowerCase()))
}

const requestBody = (names: string[]) => ({
  reviewers: names.filter(name => !name.includes('/')),
  team_reviewers: names.filter(name => name.includes('/')).map(name => name.slice(name.indexOf('/') + 1)),
})

export const requestReview: Action<ReviewInput> = {
  doing: 'request reviewers for',
  refuse({ detail }, { add }) {
    if (!isOpen(detail)) return `${stateNote(detail)}, so reviewers can't be requested.`
    const author = add.map(cleaned).find(name => name.toLowerCase() === detail.author.toLowerCase())
    return author ? `${author} opened this pull request, so they can't be asked to review it.` : undefined
  },
  needed: ({ detail }, { add }) => newcomers(detail, add).length > 0,
  run: (github, { detail }, { add }) => github.rest('POST', `/repos/${detail.repo}/pulls/${detail.number}/requested_reviewers`, requestBody(newcomers(detail, add))),
}
