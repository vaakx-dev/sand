import { readdir } from 'node:fs/promises'
import type { ProcessInfo } from './process'

const USER_HZ = 100
const MS_PER_TICK = 1000 / USER_HZ
const PARENT_FIELD = 1
const GROUP_FIELD = 2
const USER_TIME_FIELD = 11
const SYSTEM_TIME_FIELD = 12
const RSS_FIELD = 21

let pageBytes: Promise<number> | undefined

const readPageBytes = async () => {
  const getconf = Bun.spawn(['getconf', 'PAGESIZE'], { stdout: 'pipe', stderr: 'ignore' })
  return Number((await new Response(getconf.stdout).text()).trim()) || 4096
}

const statOf = async (pid: number, page: number): Promise<ProcessInfo[]> => {
  const stat = await Bun.file(`/proc/${pid}/stat`)
    .text()
    .catch(() => '')
  const close = stat.lastIndexOf(')')
  if (close < 0) return []
  const fields = stat.slice(close + 2).split(' ').map(Number)
  const field = (at: number) => fields[at] ?? 0
  return [
    {
      pid,
      parent: field(PARENT_FIELD),
      group: field(GROUP_FIELD),
      name: stat.slice(stat.indexOf('(') + 1, close),
      bytes: field(RSS_FIELD) * page,
      cpuMs: (field(USER_TIME_FIELD) + field(SYSTEM_TIME_FIELD)) * MS_PER_TICK,
    },
  ]
}

const linuxProcesses = async () => {
  const page = await (pageBytes ??= readPageBytes())
  const pids = (await readdir('/proc')).filter(name => /^\d+$/.test(name)).map(Number)
  return (await Promise.all(pids.map(pid => statOf(pid, page)))).flat()
}

export { linuxProcesses }
