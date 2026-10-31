import type { PullRef } from '@sand/github/contract'
import { errorMessage, serial } from '@sand/util'
import { writeAtomic } from '@sand/util/fs'
import { z } from 'zod'
import { refKey } from '../pull/ref'

const recordSchema = z.object({ pulls: z.record(z.string(), z.array(z.string())) })

type AgentComments = z.infer<typeof recordSchema>

export interface AgentRecordDeps {
  file: string
  hold(): () => void
  report(error: unknown): void
}

export type AgentRecord = ReturnType<typeof createAgentRecord>

const load = async ({ file, report }: AgentRecordDeps): Promise<AgentComments> => {
  const source = Bun.file(file)
  if (!(await source.exists())) return { pulls: {} }
  try {
    return recordSchema.parse(JSON.parse(await source.text()))
  } catch (error) {
    report(new Error(`Couldn't read ${file}, so comments the agent drafted earlier show as yours: ${errorMessage(error)}`))
    return { pulls: {} }
  }
}

export const createAgentRecord = (deps: AgentRecordDeps) => {
  const write = serial()
  const loading = load(deps)

  const update = (edit: (record: AgentComments) => boolean) =>
    write(async () => {
      const record = await loading
      if (!edit(record)) return
      const release = deps.hold()
      try {
        await writeAtomic(deps.file, JSON.stringify(record, null, 2))
      } finally {
        release()
      }
    })

  return {
    async ids(ref: PullRef) {
      return new Set((await loading).pulls[refKey(ref)] ?? [])
    },
    add: (ref: PullRef, id: string) =>
      update(record => {
        record.pulls[refKey(ref)] = [...(record.pulls[refKey(ref)] ?? []), id]
        return true
      }),
    keep: (ref: PullRef, present: string[]) =>
      update(record => {
        const key = refKey(ref)
        const before = record.pulls[key]
        if (!before) return false
        const kept = before.filter(id => present.includes(id))
        if (kept.length === before.length) return false
        if (kept.length) record.pulls[key] = kept
        else delete record.pulls[key]
        return true
      }),
  }
}
