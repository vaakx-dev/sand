import { compactionBrief } from '@sand/compaction/contract'
import type { Conversation } from '@sand/engine/contract'
import { promptSections } from '@sand/prompt/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { memoryCompaction } from './compaction'
import { memory, memoryChange, memoryChangeWire, memoryRead, type MemoryRef, type MemorySpace, memoryWrite } from './contract'
import { createStore } from './files'
import { memorySection } from './prompt'
import { memoryTool } from './tool'

export default definePlugin({
  name: 'memory',
  description:
    'Memory that lasts across conversations, in Markdown files the user can read and edit: a memory that loads into every conversation and notes listed there by their first line. Other plugins say whose memory a conversation uses, like a bot its own or a thread its project\'s; the agent writes it with the memory tool and tidies it when its conversation compacts',
  apply(ctx) {
    const spaces = new Map<string, MemorySpace>()
    const spaceOf = (name: string) => {
      const found = spaces.get(name)
      if (!found) throw new Error(`No memory space ${name}`)
      return found
    }
    const store = createStore({ folder: ({ space, id }) => spaceOf(space).folder(id), changed: (ref, text) => ctx.emit(memoryChange, ref, text) })
    const placed = (conversation: Conversation) =>
      [...spaces.values()].flatMap(space => {
        const id = space.of(conversation)
        return id === undefined ? [] : [{ space, ref: { space: space.name, id } satisfies MemoryRef }]
      })[0]
    const of = (conversation: Conversation) => placed(conversation)?.ref

    ctx.provide(memory, {
      ...store,
      of,
      space(space) {
        if (spaces.has(space.name)) throw new Error(`The memory space ${space.name} is already taken`)
        spaces.set(space.name, space)
        return () => void spaces.delete(space.name)
      },
    })
    ctx.on(compactionBrief, conversation => {
      const ref = of(conversation)
      return ref && memoryCompaction(store, ref)
    })
    ctx.on(promptSections, async (sections, conversation) => {
      const found = placed(conversation)
      return found ? [...sections, await memorySection(store, found.space, found.ref)] : sections
    })
    ctx.watch(tools, found => found?.register(memoryTool(store, of)))
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(memoryRead, ref => store.read(ref)),
        found.handle(memoryWrite, ({ text, ...ref }) => store.write(ref, text)),
        ctx.on(memoryChange, (ref, text) => found.broadcast(memoryChangeWire, [ref, text])),
      )
    })
  },
})
