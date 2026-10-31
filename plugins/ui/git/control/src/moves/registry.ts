import { sig } from '@vaakx-dev/vrui'
import type { GitMove, GitMoves } from '../contract'

export const moveRegistry = (): GitMoves => {
  const list = sig<readonly GitMove[]>([])

  const register: GitMoves['register'] = move => {
    list.update(current => [...current, move])
    return () => list.update(current => current.filter(other => other !== move))
  }

  const offered: GitMoves['offered'] = context => list.get().filter(move => move.offers(context))

  return { register, offered }
}
