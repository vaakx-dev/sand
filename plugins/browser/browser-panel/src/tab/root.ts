import type { Thread, Threads } from '@sand/web-client/contract'

export interface TabKey {
  thread: string
  device?: string
}

export const rootKey = (threads: Threads): TabKey | undefined => {
  const current = threads.current()
  if (!current) return undefined
  const device = current.device ?? threads.device()
  let id = current.id
  let thread: Thread | undefined = current
  while (thread?.info.kind === 'agent' && thread.info.parent) {
    id = thread.info.parent
    thread = threads.get(id)
  }
  return { thread: id, device }
}

export const sameKey = (a: TabKey | undefined, b: TabKey | undefined) => a?.thread === b?.thread && a?.device === b?.device
