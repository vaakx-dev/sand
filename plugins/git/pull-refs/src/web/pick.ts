import { matching } from '@sand/util'
import type { PullSnapshot } from '../pull'

const keyOf = ({ repo, number }: PullSnapshot) => `${repo}#${number}`

export const pickPulls = <T extends PullSnapshot>(pulls: T[], query: string) => {
  const unique = pulls.filter((pull, index) => pulls.findIndex(other => keyOf(other) === keyOf(pull)) === index)
  return matching(
    unique.map(pull => `#${pull.number} ${pull.title}`),
    query,
    true,
  ).map(index => unique[index]!)
}
