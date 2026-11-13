import { basename } from 'node:path'
import { linuxProcesses } from './linux'
import { windowsProcesses } from './windows'

interface ProcessInfo {
  pid: number
  parent: number
  group?: number
  name: string
  bytes: number
  cpuMs: number
}

const KIB = 1024
const PS_COLUMNS = 'pid=,ppid=,pgid=,rss=,time=,comm='

const cpuMsOf = (time: string) => {
  const [days, clock] = time.includes('-') ? time.split('-') : ['0', time]
  const seconds = (clock ?? '').split(':').reduce((total, part) => total * 60 + Number(part), 0)
  return (Number(days) * 86_400 + seconds) * 1000
}

const psLine = (line: string): ProcessInfo[] => {
  const [pid, parent, group, kib, time, ...command] = line.trim().split(/\s+/)
  const entry = { pid: Number(pid), parent: Number(parent), group: Number(group), bytes: Number(kib) * KIB, cpuMs: cpuMsOf(time ?? ''), name: basename(command.join(' ')) }
  return [entry.pid, entry.parent, entry.group, entry.bytes, entry.cpuMs].some(Number.isNaN) ? [] : [entry]
}

const macProcesses = async () => {
  const ps = Bun.spawn(['ps', '-A', '-o', PS_COLUMNS], { stdout: 'pipe', stderr: 'ignore' })
  const listing = await new Response(ps.stdout).text()
  return listing.split('\n').flatMap(psLine)
}

const processes = async (): Promise<ProcessInfo[]> => {
  if (process.platform === 'win32') return windowsProcesses()
  if (process.platform === 'linux') return linuxProcesses()
  return macProcesses()
}

const forestOf = (all: ProcessInfo[]) => {
  const byPid = new Map(all.map(entry => [entry.pid, entry]))
  const children = Map.groupBy(all, entry => entry.parent)
  const groups = Map.groupBy(
    all.filter(entry => entry.group !== undefined),
    entry => entry.group,
  )
  return (roots: number[]) => {
    const tree = new Map<number, ProcessInfo>()
    const add = (entry: ProcessInfo) => tree.set(entry.pid, entry)
    for (const root of roots) [byPid.get(root), ...(groups.get(root) ?? [])].forEach(entry => entry && add(entry))
    for (const entry of tree.values()) children.get(entry.pid)?.forEach(add)
    return [...tree.values()]
  }
}

export { forestOf, processes, type ProcessInfo }
