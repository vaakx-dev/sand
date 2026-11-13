import { forestOf, processes as machineProcesses } from '@sand/machine'
import { definePlugin } from 'drydock'
import { type ChatMemory, processes, type Processes } from './contract'

const rootsByChat = () => {
  const roots = new Map<string, Set<number>>()
  return {
    add(conversation: string, pid: number) {
      const found = roots.get(conversation) ?? new Set()
      roots.set(conversation, found.add(pid))
      return () => {
        found.delete(pid)
        if (!found.size && roots.get(conversation) === found) roots.delete(conversation)
      }
    },
    entries: () => [...roots].map(([conversation, pids]) => ({ conversation, roots: [...pids] })),
  }
}

export default definePlugin({
  name: 'processes',
  description: "Tracks the process trees each chat starts, like its commands and its Claude Code or Codex app, and measures the memory each chat's trees use",
  apply(ctx) {
    const roots = rootsByChat()

    const chats = async (): Promise<ChatMemory[]> => {
      const tracked = roots.entries()
      if (!tracked.length) return []
      const treeOf = forestOf(await machineProcesses())
      const measured = tracked.map(({ conversation, roots: chatRoots }) => {
        const tree = treeOf(chatRoots)
        return { conversation, bytes: tree.reduce((sum, entry) => sum + entry.bytes, 0), pids: tree.map(entry => entry.pid) }
      })
      return measured.toSorted((first, second) => second.bytes - first.bytes)
    }

    const service: Processes = { track: roots.add, chats }
    ctx.provide(processes, service)
  },
})
