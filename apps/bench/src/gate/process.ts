import { readdirSync, readFileSync } from 'node:fs'

interface Stat {
  pid: number
  parent: number
  cpuMs: number
  rssBytes: number
}

export interface Usage {
  cpuMs: number
  rssBytes: number
}

const TICK_MS = 10

const PAGE_BYTES = 4096

const FIELDS = { parent: 1, userTicks: 11, systemTicks: 12, rssPages: 21 }

const stat = (pid: number): Stat | undefined => {
  try {
    const text = readFileSync(`/proc/${pid}/stat`, 'utf8')
    const fields = text.slice(text.lastIndexOf(')') + 2).split(' ').map(Number)
    return {
      pid,
      parent: fields[FIELDS.parent]!,
      cpuMs: (fields[FIELDS.userTicks]! + fields[FIELDS.systemTicks]!) * TICK_MS,
      rssBytes: fields[FIELDS.rssPages]! * PAGE_BYTES,
    }
  } catch {
    return undefined
  }
}

const processes = () =>
  readdirSync('/proc')
    .filter(name => /^\d+$/.test(name))
    .flatMap(name => stat(Number(name)) ?? [])

const family = (root: number, all: Stat[]) => {
  const children = Map.groupBy(all, process => process.parent)
  const byPid = new Map(all.map(process => [process.pid, process]))
  const found: Stat[] = []
  const visit = (pid: number) => {
    const process = byPid.get(pid)
    if (process) found.push(process)
    for (const child of children.get(pid) ?? []) visit(child.pid)
  }
  visit(root)
  return found
}

const usage = (root: number): Usage =>
  family(root, processes()).reduce((sum, process) => ({ cpuMs: sum.cpuMs + process.cpuMs, rssBytes: sum.rssBytes + process.rssBytes }), { cpuMs: 0, rssBytes: 0 })

export { usage }
