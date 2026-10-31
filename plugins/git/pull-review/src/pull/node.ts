import type { GitHub, PullRef } from '@sand/github/contract'
import { pullVariables, refKey, refLabel } from './ref'

const query = `query PullNode($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) { pullRequest(number: $number) { id } }
}`

interface PullNodeData {
  repository: { pullRequest: { id: string } | null } | null
}

export type PullNodes = ReturnType<typeof createPullNodes>

export const createPullNodes = (github: GitHub) => {
  const known = new Map<string, string>()

  const fetch = async (ref: PullRef) => {
    const data = await github.graphql<PullNodeData>(query, pullVariables(ref))
    const id = data.repository?.pullRequest?.id
    if (!id) throw new Error(`GitHub couldn't find ${refLabel(ref)}.`)
    return id
  }

  return {
    note: (ref: PullRef, id: string) => void known.set(refKey(ref), id),
    async id(ref: PullRef) {
      const cached = known.get(refKey(ref))
      if (cached) return cached
      const id = await fetch(ref)
      known.set(refKey(ref), id)
      return id
    },
  }
}
