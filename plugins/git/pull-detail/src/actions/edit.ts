import { pullLabel } from '../pulls/ref'
import type { Action } from './action'

export interface EditInput {
  title?: string
  body?: string
}

const updatePull = `
mutation EditPull($input: UpdatePullRequestInput!) {
  updatePullRequest(input: $input) { clientMutationId }
}
`

const changes = (id: string, { title, body }: EditInput) => ({
  pullRequestId: id,
  ...(title === undefined ? {} : { title: title.trim() }),
  ...(body === undefined ? {} : { body }),
})

export const edit: Action<EditInput> = {
  doing: 'edit',
  refuse({ detail }, { title, body }) {
    if (title === undefined && body === undefined) return 'Give a new title or description to change.'
    if (title !== undefined && !title.trim()) return 'A pull request needs a title.'
    if (!detail.canEdit) return `Your GitHub account can't edit ${pullLabel(detail)}; only its author and people with write access to ${detail.repo} can.`
    return undefined
  },
  needed: ({ detail }, { title, body }) => (title !== undefined && title.trim() !== detail.title) || (body !== undefined && body !== detail.body),
  run: (github, pull, input) => github.graphql(updatePull, { input: changes(pull.ids.pull, input) }),
}
