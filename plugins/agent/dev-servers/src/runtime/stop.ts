import { forestOf } from '@sand/machine'
import type { OwnedTree } from '@sand/processes/contract'

const STOP_GRACE_MS = 3_000
const STOP_POLL_MS = 100

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const signal = (pids: number[], name: NodeJS.Signals) => {
  for (const pid of pids) {
    try {
      process.kill(pid, name)
    } catch {}
  }
}

const launcherOf = (tree: OwnedTree, pid: number) => {
  const byPid = new Map(tree.processes.map(entry => [entry.pid, entry]))
  let at = byPid.get(pid)
  while (at && at.parent !== tree.root && byPid.has(at.parent)) at = byPid.get(at.parent)
  return at?.pid ?? pid
}

const ended = async (pids: number[]) => {
  const deadline = Date.now() + STOP_GRACE_MS
  while (pids.some(alive) && Date.now() < deadline) await Bun.sleep(STOP_POLL_MS)
  return pids.filter(alive)
}

const runnersOf = (tree: OwnedTree, pid: number) => (tree.kind === 'command' ? tree.processes : forestOf(tree.processes)([launcherOf(tree, pid)]))

const stopServer = async (tree: OwnedTree, pid: number) => {
  const sand = new Set([process.pid, process.ppid])
  const pids = runnersOf(tree, pid)
    .map(entry => entry.pid)
    .filter(found => !sand.has(found))
  signal(pids, 'SIGTERM')
  signal(await ended(pids), 'SIGKILL')
}

export { stopServer }
