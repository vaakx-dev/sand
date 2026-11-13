import { windowsProcesses } from './windows'

interface ProcessInfo {
  pid: number
  parent: number
  group?: number
  bytes: number
}

const KIB = 1024

const psLine = (line: string): ProcessInfo[] => {
  const [pid, parent, group, kib] = line.trim().split(/\s+/).map(Number)
  if (pid === undefined || parent === undefined || group === undefined || kib === undefined || Number.isNaN(kib)) return []
  return [{ pid, parent, group, bytes: kib * KIB }]
}

const unixProcesses = async () => {
  const ps = Bun.spawn(['ps', '-A', '-o', 'pid=,ppid=,pgid=,rss='], { stdout: 'pipe', stderr: 'ignore' })
  const listing = await new Response(ps.stdout).text()
  return listing.split('\n').flatMap(psLine)
}

const processes = async (): Promise<ProcessInfo[]> => (process.platform === 'win32' ? windowsProcesses() : unixProcesses())

const forestOf = (all: ProcessInfo[]) => {
  const byPid = new Map(all.map(entry => [entry.pid, entry]))
  const children = Map.groupBy(all, entry => entry.parent)
  const groups = Map.groupBy(
    all.filter(entry => entry.group !== undefined),
    entry => entry.group,
  )
  return (roots: number[]) => {
    const tree = new Map<number, ProcessInfo>()
    const add = (entry: ProcessInfo) => entry.pid !== process.pid && tree.set(entry.pid, entry)
    for (const root of roots) [byPid.get(root), ...(groups.get(root) ?? [])].forEach(entry => entry && add(entry))
    for (const entry of tree.values()) children.get(entry.pid)?.forEach(add)
    return [...tree.values()]
  }
}

export { forestOf, processes, type ProcessInfo }
