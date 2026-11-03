import { type GitRunner, pathKey } from '@sand/git/contract'
import type { SubModel } from '@sand/sub-model/contract'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { SetupAnswer, SetupLines, SetupProposal } from '../contract'
import type { WorktreeRecord } from '../records/schema'
import type { RecordStore } from '../records/store'
import { planSteps, setupFileName } from '../setup/plan'
import type { Setups } from '../setup/setups'
import { freshSetup } from '../setup/state'
import { askSetup } from './ask'
import { createDeclined } from './declined'
import { gatherFacts } from './facts'
import { writeSetupFile } from './file'

export interface ProposalDeps {
  git: GitRunner
  store: RecordStore
  setups: Setups
  file: string
  sub(): SubModel | undefined
  send(proposal: SetupProposal): void
}

export type Proposals = ReturnType<typeof createProposals>

export const createProposals = ({ git, store, setups, file, sub, send }: ProposalDeps) => {
  const declined = createDeclined(file)
  const offered = new Set<string>()
  const shown = new Map<string, SetupLines>()

  const publish = (record: WorktreeRecord, lines: SetupLines | null) =>
    send({ path: record.path, ...(record.sessions[0] ? { session: record.sessions[0] } : {}), lines })

  const runSaved = async (record: WorktreeRecord) => {
    const setup = (record.setup ??= freshSetup(record.path, []))
    setup.steps.push(...(await planSteps(record.main)))
    await setups.start(record)
  }

  const answers: Record<SetupAnswer, (record: WorktreeRecord, lines: SetupLines) => Promise<void>> = {
    save: async (record, lines) => {
      await writeSetupFile(record.main, lines)
      await runSaved(record)
    },
    decline: record => declined.add(pathKey(record.main)),
  }

  return {
    async offer(record: WorktreeRecord) {
      const model = sub()
      const project = pathKey(record.main)
      if (!model?.has('fast') || offered.has(project)) return
      offered.add(project)
      if (existsSync(join(record.main, setupFileName)) || (await declined.has(project))) return
      const facts = await gatherFacts(git, record.main)
      if (!facts.files.length && !facts.commands.length) return
      const lines = await askSetup(model, record.main, facts, record.sessions[0])
      if (!lines.copy.length && !lines.run.length) return
      shown.set(pathKey(record.path), lines)
      publish(record, lines)
    },
    async request(path: string, answer: SetupAnswer | undefined) {
      await store.ready()
      const record = store.containing(path)
      const lines = record && shown.get(pathKey(record.path))
      if (!record || !lines) return null
      if (!answer) return lines
      const key = pathKey(record.path)
      shown.delete(key)
      try {
        await answers[answer](record, lines)
      } catch (error) {
        shown.set(key, lines)
        throw error
      }
      publish(record, null)
      return null
    },
  }
}
