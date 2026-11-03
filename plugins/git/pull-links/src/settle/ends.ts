import { type GitHub, type PullRef, pullKey, pullVariables } from '@sand/github/contract'

interface EndNode {
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  mergedAt: string | null
  closedAt: string | null
}

type EndsData = Record<string, { pullRequest: EndNode | null } | null>

/** When each pull request merged or closed, by pullKey; undefined while it is open. Pull requests GitHub didn't answer for are left out. */
export type PullEnds = Map<string, number | undefined>

const batchSize = 50

const endOf = (node: EndNode) => {
  if (node.state === 'OPEN') return undefined
  const at = Date.parse(node.mergedAt ?? node.closedAt ?? '')
  return Number.isNaN(at) ? Date.now() : at
}

const endsQuery = (count: number) => {
  const indexes = Array.from({ length: count }, (_, index) => index)
  const params = indexes.map(index => `$o${index}: String!, $n${index}: String!, $p${index}: Int!`).join(', ')
  const fields = indexes.map(index => `p${index}: repository(owner: $o${index}, name: $n${index}) { pullRequest(number: $p${index}) { state mergedAt closedAt } }`)
  return `query PullEnds(${params}) {\n  ${fields.join('\n  ')}\n}`
}

const variablesOf = (pulls: PullRef[]) =>
  Object.fromEntries(
    pulls.flatMap((pull, index) => {
      const { owner, name, number } = pullVariables(pull)
      return [
        [`o${index}`, owner],
        [`n${index}`, name],
        [`p${index}`, number],
      ]
    }),
  )

const readBatch = async (github: GitHub, pulls: PullRef[], ends: PullEnds) => {
  const data = await github.graphql<EndsData>(endsQuery(pulls.length), variablesOf(pulls))
  pulls.forEach((pull, index) => {
    const node = data[`p${index}`]?.pullRequest
    if (node) ends.set(pullKey(pull), endOf(node))
  })
}

/** One cheap query per 50 pull requests. A batch GitHub refuses, say for one pull request that's gone, is retried one at a time so the rest still answer. */
export const readEnds = async (github: GitHub, pulls: PullRef[], failed: (pull: PullRef, error: unknown) => void): Promise<PullEnds> => {
  const ends: PullEnds = new Map()
  for (let start = 0; start < pulls.length; start += batchSize) {
    const batch = pulls.slice(start, start + batchSize)
    try {
      await readBatch(github, batch, ends)
    } catch (error) {
      if (batch.length === 1) failed(batch[0]!, error)
      else for (const pull of batch) await readBatch(github, [pull], ends).catch(error => failed(pull, error))
    }
  }
  return ends
}
