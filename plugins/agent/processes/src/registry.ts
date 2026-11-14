import { forestOf, type ProcessInfo } from '@sand/machine'
import type { OwnedTree, Tracked } from './contract'

interface Held extends Tracked {
  exited: boolean
}

type Forest = ReturnType<typeof forestOf>

const groupOf = (leader: number, all: ProcessInfo[]) => all.filter(entry => entry.group === leader).map(entry => entry.pid)

const rootsOf = (held: Held, all: ProcessInfo[]) => {
  if (held.job) return held.job.pids()
  if (held.exited) return groupOf(held.pid, all)
  return [held.pid]
}

const groupAlive = (leader: number) => {
  try {
    process.kill(-leader, 0)
    return true
  } catch {
    return false
  }
}

const leftRunning = (held: Held) => (held.job ? held.job.pids().length > 0 : process.platform !== 'win32' && groupAlive(held.pid))

const ownedOf = ({ conversation, pid, label, kind }: Held, processes: ProcessInfo[]): OwnedTree => ({ conversation, root: pid, label, kind, processes })

export const createRegistry = () => {
  const tracked = new Set<Held>()

  const release = (held: Held) => {
    tracked.delete(held)
    held.job?.close()
  }

  const treeOf = (held: Held, all: ProcessInfo[], forest: Forest) => {
    const processes = forest(rootsOf(held, all))
    if (held.exited && !processes.length) release(held)
    return ownedOf(held, processes)
  }

  return {
    track(entry: Tracked) {
      const held = { ...entry, exited: false }
      tracked.add(held)
      return () => {
        held.exited = true
        if (!leftRunning(held)) release(held)
      }
    },
    empty: () => tracked.size === 0,
    trees(all: ProcessInfo[]) {
      const forest = forestOf(all)
      return [...tracked].map(held => treeOf(held, all, forest)).filter(tree => tree.processes.length > 0)
    },
    close: () => [...tracked].forEach(release),
  }
}

export type Registry = ReturnType<typeof createRegistry>
