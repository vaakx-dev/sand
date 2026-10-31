import type { PullStack } from '../../contract'
import type { PullNode } from './query'

export const pullStack = ({ stack, stackEntry }: PullNode): PullStack | undefined => {
  if (!stack || !stackEntry) return undefined
  const layers = (stack.entries.nodes ?? [])
    .flatMap(entry => (entry?.pullRequest ? [{ position: entry.position, number: entry.pullRequest.number }] : []))
    .sort((a, b) => a.position - b.position)
    .map(entry => entry.number)
  return { number: stack.number, position: stackEntry.position, layers }
}
