import { copyProject, folderName, plural } from '@sand/kit'
import type { SyncInspect } from '@sand/protocol'
import { usage } from './usage'
import type { ProjectFlags } from './flags'
import { findGroup } from './find'
import { loadGroups, locationOn, type Group, type Loaded } from './groups'
import { sizeText } from './format'
import type { Pc, Pcs } from './pcs'
import { progressPrinter } from './progress'

const sourceOf = (pcs: Pcs, group: Group, from: string | undefined) => {
  if (from) {
    const pc = pcs.named(from)
    const found = locationOn(group, pc)
    if (!found) throw new Error(`${group.name} is not on ${pc.name}`)
    if (!found.online) throw new Error(`${pc.name} is offline`)
    return found
  }
  const online = group.locations.filter(location => location.online && !location.missing)
  const found = online.length === 1 ? online[0] : locationOn(group, pcs.local)
  if (!found) throw new Error(online.length ? `${group.name} lives on several PCs; pick one with --from` : `no online PC has a copy of ${group.name}`)
  return found
}

const destinationOf = (loaded: Loaded, pc: Pc, folder: string, path: string | undefined) => {
  if (path) return path
  const list = loaded.lists.get(pc)
  if (!list) throw new Error(`${pc.name} is offline`)
  const { root, sep } = list
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
  const loaded = await loadGroups(pcs)
  const group = findGroup(loaded.groups, value)
  const target = pcs.named(flags.to)
  if (locationOn(group, target)) throw new Error(`${group.name} is already on ${target.name}; sand project sync updates it`)
  const source = sourceOf(pcs, group, flags.from)
  const inspected = await pcs.call<SyncInspect>({ type: 'sync.inspect', path: source.path }, source.pc.device)
  if (inspected.blocked) throw new Error(inspected.blocked)
  const path = destinationOf(loaded, target, folderName(source.path), flags.path)
  console.log(`copying ${group.name} from ${source.pc.name} to ${target.name}  ${path}`)
  describe(inspected).forEach(line => console.log(line))
  if (flags.setup && !inspected.setup) console.log('  no setup command found')
  const run = { setup: flags.setup ? inspected.setup : undefined, project: group.id }
  await copyProject(pcs.call, { path: source.path, device: source.pc.device }, { path, device: target.device }, run, progressPrinter())
  console.log(`copied ${group.name} to ${target.name}  ${path}`)
}
