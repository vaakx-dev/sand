import { type GitHub, isForbidden, isMissing, type PullRef, pullKey, pullVariables } from '@sand/github/contract'
import type { OnceReport } from '../report/once'

type PullClosing = { closed: true; closedAt: string } | { closed: false; closedAt: string | null }

type ClosingData = Record<string, { pullRequest: PullClosing | null } | null>

const batchSize = 50

const closingQuery = (count: number) => {
  const indexes = Array.from({ length: count }, (_, index) => index)
  const params = indexes.map(index => `$o${index}: String!, $n${index}: String!, $p${index}: Int!`).join(', ')
  const fields = indexes.map(index => `p${index}: repository(owner: $o${index}, name: $n${index}) { pullRequest(number: $p${index}) { closed closedAt } }`)
  return `query PullClosings(${params}) {\n  ${fields.join('\n  ')}\n}`
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

const isGone = (error: unknown) => isMissing(error) || isForbidden(error)

export const createEnds = (github: GitHub, failures: OnceReport) => {
  const gone = new Set<string>()

  const readBatch = async (pulls: PullRef[], ended: Map<string, number>) => {
    const data = await github.graphql<ClosingData>(closingQuery(pulls.length), variablesOf(pulls))
    pulls.forEach((pull, index) => {
      const key = pullKey(pull)
      const closing = data[`p${index}`]?.pullRequest
      if (!closing) return
      failures.passed(`closing:${key}`)
      if (closing.closed) ended.set(key, Date.parse(closing.closedAt))
    })
  }

  const readEach = async (pulls: PullRef[], ended: Map<string, number>) => {
    for (const pull of pulls) {
      await readBatch([pull], ended).catch((error: unknown) => {
        if (isGone(error)) gone.add(pullKey(pull))
        failures.failed(`closing:${pullKey(pull)}`, error)
      })
    }
  }

  return async (pulls: PullRef[]) => {
    const readable = pulls.filter(pull => !gone.has(pullKey(pull)))
    const ended = new Map<string, number>()
    for (let start = 0; start < readable.length; start += batchSize) {
      const batch = readable.slice(start, start + batchSize)
      await readBatch(batch, ended).catch(() => readEach(batch, ended))
    }
    return ended
  }
}
