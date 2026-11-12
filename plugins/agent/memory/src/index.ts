import { llm } from '@sand/accounts/contract'
import { compactionBrief } from '@sand/compaction/contract'
import type { Conversation } from '@sand/engine/contract'
import { promptSections } from '@sand/prompt/contract'
import { server } from '@sand/server/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { memoryCheck } from './check'
import { memoryCompaction } from './compaction'
import { memory, memoryChange, memoryChangeWire, memoryNoteWrite, memoryRead, type MemoryFiles, type MemoryRef, type MemorySpace, memoryStore, memoryWrite } from './contract'
import { createStore } from './files'
import { memorySection } from './prompt'
import { memoryTool } from './tool'

export default definePlugin({
  name: 'memory',
  description:
    'Memory that lasts across conversations, in Markdown files the user can read and edit: a memory that loads into every conversation and notes listed there by their first line. Other plugins say whose memory a conversation uses, like a bot its own or a thread its project\'s; the agent writes it with the memory tool and tidies it when its conversation compacts',
  inject: { llm, tools },
  apply(ctx) {
    const spaces = new Map<string, MemorySpace>()
    const spaceOf = (name: string) => {
      const found = spaces.get(name)
      if (!found) throw new Error(`No memory space ${name}`)
      return found
    }
    const store = createStore({
      folder: ({ space, id }) => spaceOf(space).folder(id),
      changed: (ref, text) => ctx.emit(memoryChange, ref, text),
      stored: ref => ctx.emit(memoryStore, ref),
    })
    const placed = (conversation: Conversation) =>
      [...spaces.values()].flatMap(space => {
        const id = space.of(conversation)
        return id === undefined ? [] : [{ space, ref: { space: space.name, id } satisfies MemoryRef }]
      })[0]
    const of = (conversation: Conversation) => placed(conversation)?.ref
    const filesOf = async (ref: MemoryRef): Promise<MemoryFiles> => {
      const [text, notes] = await Promise.all([store.read(ref), store.notes(ref)])
      return { text, notes }
    }

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
      return ref && memoryCompaction({ store, ref, check: memoryCheck({ llm: ctx.llm, tools: ctx.tools, conversation }) })
    })
    ctx.on(promptSections, async (sections, conversation) => {
      const found = placed(conversation)
      return found ? [...sections, await memorySection(store, found.space, found.ref)] : sections
    })
    ctx.effect(() => ctx.tools.register(memoryTool(store, of)))
    ctx.watch(server, found => {
      if (!found) return
      return joinDisposers(
        found.handle(memoryRead, filesOf),
        found.handle(memoryWrite, ({ text, ...ref }) => store.write(ref, text)),
        found.handle(memoryNoteWrite, ({ name, text, ...ref }) => store.writeNote(ref, { name, text })),
        ctx.on(memoryStore, ref =>
          void filesOf(ref).then(
            files => found.broadcast(memoryChangeWire, [ref, files]),
            error => ctx.report(error),
          ),
        ),
      )
    })
  },
})
