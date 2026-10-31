import { sig } from '@vaakx-dev/vrui'
import type { GitActions, GitPrimaryAction } from '../contract'

export const primaryRegistry = () => {
  const list = sig<readonly GitPrimaryAction[]>([])

  const register: GitActions['register'] = action => {
    list.update(current => [...current, action])
    return () => list.update(current => current.filter(other => other !== action))
  }

  return { register, list: () => list.get() }
}

export type PrimaryRegistry = ReturnType<typeof primaryRegistry>
