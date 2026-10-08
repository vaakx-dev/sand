import { copyProject, folderName, plural } from '@sand/kit'
import type { ProjectList, SyncInspect } from '@sand/protocol'
import { usage } from './usage'
import type { ProjectFlags } from './flags'
import { findGroup } from './find'
import { loadGroups, locationOn, type Group } from './groups'
import { sizeText } from './format'
import type { Pcs } from './pcs'
import { progressPrinter } from './progress'

const sourceOf = (pcs: Pcs, group: Group, from: string | undefined) => {
  if (from) {
    const pc = pcs.named(from)
    const found = locationOn(group, pc)
    if (!found) throw new Error(`${group.name} is not on ${pc.name}`)
    return found
  }
  const found = group.locations.length === 1 ? group.locations[0] : locationOn(group, pcs.local)
  if (!found) throw new Error(`${group.name} lives on several PCs; pick one with --from`)
  return found
}

const destinationOf = async (pcs: Pcs, device: string | undefined, folder: string, path: string | undefined) => {
  if (path) return path
  const { root, sep } = await pcs.call<ProjectList>({ type: 'projects.list' }, device)
  return `${root.endsWith(sep) ? root.slice(0, -sep.length) : root}${sep}${folder}`
}

const describe = (inspected: SyncInspect) => {
  const lines = [`  ${plural(inspected.files, 'file')}, ${sizeText(inspected.bytes)}${inspected.git ? `, history ${sizeText(inspected.historyBytes)}` : ''}`]
  if (inspected.dirty) lines.push(`  ${plural(inspected.dirty, 'uncommitted change')} included`)
  if (inspected.skipped.length) lines.push(`  skipped: ${inspected.skipped.map(item => `${item.name} (${sizeText(item.bytes)})`).join(', ')}`)
  if (inspected.secrets.length) lines.push(`  left out (secrets): ${inspected.secrets.join(', ')}`)
  if (inspected.setup) lines.push(`  setup: ${inspected.setup}`)
  return lines
}

export const copyToPc = async (pcs: Pcs, [value]: string[], flags: ProjectFlags) => {
  if (!value || !flags.to) throw new Error(usage)
  const { groups } = await loadGroups(pcs)
  const group = findGroup(groups, value)
  const target = pcs.named(flags.to)
  if (locationOn(group, target)) throw new Error(`${group.name} is already on ${target.name}; sand project sync updates it`)
  const source = sourceOf(pcs, group, flags.from)
  const inspected = await pcs.call<SyncInspect>({ type: 'sync.inspect', path: source.project.path }, source.pc.device)
  if (inspected.blocked) throw new Error(inspected.blocked)
  const path = await destinationOf(pcs, target.device, folderName(source.project.path), flags.path)
  console.log(`copying ${group.name} from ${source.pc.name} to ${target.name}  ${path}`)
  describe(inspected).forEach(line => console.log(line))
  if (flags.setup && !inspected.setup) console.log('  no setup command found')
  const run = { setup: flags.setup ? inspected.setup : undefined }
  await copyProject(pcs.call, { path: source.project.path, device: source.pc.device }, { path, device: target.device }, run, progressPrinter())
  console.log(`copied ${group.name} to ${target.name}  ${path}`)
}
