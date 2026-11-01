import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { span } from '@vaakx-dev/vrui'
import type { Change } from '../places/view'

const lines = (kit: Kit, change: Change) =>
  change.add || change.del ? span({ class: 'inline-flex font-mono' }, kit.lineStat(change.add, change.del)) : plural(change.files, 'file')

export const changeMark = (kit: Kit, change: Change) =>
  span({ class: 'inline-flex shrink-0 items-center text-xs text-neutral-400', title: `${plural(change.files, 'file')} not committed` }, lines(kit, change))
