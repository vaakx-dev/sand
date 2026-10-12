import { plural } from '@sand/kit'
import { sendProject } from '@sand/sync/flows'
import { usage } from './usage'
import type { ProjectFlags } from './flags'
import { loadGroup } from './find'
import { locationOn } from './groups'
import type { Pcs } from './pcs'
import { progressPrinter } from './progress'

export const syncProject = async (pcs: Pcs, [value]: string[], { from, to }: ProjectFlags) => {
  if (!value || !from || !to) throw new Error(usage)
  const source = pcs.named(from)
  const target = pcs.named(to)
  const { group } = await loadGroup(pcs, value)
  const here = locationOn(group, source)
  const there = locationOn(group, target)
  if (!here) throw new Error(`${group.name} is not on ${source.name}`)
  if (!there) throw new Error(`${group.name} is not on ${target.name}; sand project copy puts it there`)
  const applied = await sendProject(pcs, { path: here.path, device: source.id }, { path: there.path, device: target.id }, progressPrinter())
  if (applied.result === 'current') return console.log(`${group.name} is already up to date`)
  if (applied.result === 'applied') return console.log(`applied ${plural(applied.changed, 'file')} on ${target.name}`)
  if (applied.result === 'merged') return console.log(`merged ${group.name}; both ${source.name} and ${target.name} now have the combined work`)
  console.log(`${plural(applied.conflicts.length, 'conflict')} on ${target.name}, in ${there.path}:`)
  applied.conflicts.forEach(file => console.log(`  ${file}`))
  console.log(`resolve them with: sand project resolve ${group.name} --on ${target.name} --ours|--theirs`)
  console.log(`or open the project on ${target.name} in sand and ask it to resolve the merge conflicts`)
}
