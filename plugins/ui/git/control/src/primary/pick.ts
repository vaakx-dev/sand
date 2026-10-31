import { type GitActionContext, type GitButton, gitBaseRank, type GitPrimaryAction } from '../contract'

export interface Picked {
  button: GitButton
  owner?: GitPrimaryAction
}

interface Ranked extends Picked {
  rank: number
}

const beats = (rank: number, owner: GitPrimaryAction, best: Ranked | undefined) => {
  if (!best || rank > best.rank) return true
  return rank === best.rank && best.owner !== undefined && owner.id < best.owner.id
}

export const pickPrimary = (actions: readonly GitPrimaryAction[], context: GitActionContext): Picked | undefined => {
  let best: Ranked | undefined = context.base && { button: context.base, rank: gitBaseRank }
  for (const owner of actions) {
    const choice = owner.decide(context)
    if (!choice || !beats(choice.rank, owner, best)) continue
    const { rank, ...button } = choice
    best = { button, owner, rank }
  }
  return best
}
