import { plural } from '@sand/util'
import type { RemoveCheck } from '../contract'

export const unsaved = ({ uncommitted, unpushed }: RemoveCheck) =>
  [uncommitted ? plural(uncommitted, 'uncommitted file') : '', unpushed ? plural(unpushed, 'unpushed commit') : ''].filter(Boolean).join(', ')
