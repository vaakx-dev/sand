import type { Thread, Threads } from '@sand/web-client/contract'

const positionOf = (thread: Thread) => thread.info.position ?? thread.info.created

export const byPosition = (a: Thread, b: Thread) => positionOf(b) - positionOf(a)

const between = (above: number | undefined, below: number | undefined) => {
  if (above !== undefined && below !== undefined) return (above + below) / 2
  if (below !== undefined) return below + 1
  if (above !== undefined) return above - 1
  return undefined
}

export const moveThread = (threads: Threads, id: string, above: string | undefined, below: string | undefined) => {
  const at = (other: string | undefined) => {
    const thread = other ? threads.get(other) : undefined
    return thread ? positionOf(thread) : undefined
  }
  const position = between(at(above), at(below))
  if (threads.get(id) && position !== undefined) void threads.move(id, position)
}
