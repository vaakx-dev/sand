import { errorMessage } from '@sand/util'
import { join } from 'node:path'
import { z } from 'zod'
import type { PlannedStep } from '../records/schema'

export const setupFileName = join('.sand', 'worktree.toml')

const setupFile = z.object({
  copy: z.array(z.string()).default([]),
  run: z.array(z.string()).default([]),
})

const problem = (error: unknown) => (error instanceof z.ZodError ? z.prettifyError(error) : errorMessage(error))

const copyStep = (entry: string, index: number): PlannedStep => ({ id: `copy-${index}`, label: `Copy ${entry}`, state: 'wait', copy: entry })

const runStep = (command: string, index: number): PlannedStep => ({ id: `run-${index}`, label: `Run ${command}`, state: 'wait', run: command })

export const configStep = 'config'

export const planSteps = async (main: string): Promise<PlannedStep[]> => {
  const file = Bun.file(join(main, setupFileName))
  try {
    if (!(await file.exists())) return []
    const { copy, run } = setupFile.parse(Bun.TOML.parse(await file.text()))
    return [...copy.map(copyStep), ...run.map(runStep)]
  } catch (error) {
    return [{ id: configStep, label: `Read ${setupFileName}`, state: 'fail', output: problem(error) }]
  }
}
