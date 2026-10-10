import type { WorktreeSetup } from '../contract'
import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { isAbsolute, join, normalize } from 'node:path'
import { runCommand } from './shell'
import type { Step } from './steps'

const inside = (name: string) => {
  const clean = normalize(name)
  return !isAbsolute(clean) && !clean.startsWith('..')
}

const copyStep = (main: string, path: string, name: string): Step => ({
  label: `Copy ${name}`,
  async run() {
    if (!inside(name)) throw new Error(`${name} is outside the project`)
    const from = join(main, name)
    if (!existsSync(from)) return `Skip ${name}, it isn't in ${main}`
    await cp(from, join(path, name), { recursive: true, force: true })
  },
})

const runStep = (path: string, command: string): Step => ({ label: command, run: () => runCommand(path, command) })

export const setupSteps = (setup: WorktreeSetup, main: string, path: string): Step[] => [
  ...setup.copy.map(name => copyStep(main, path, name)),
  ...setup.run.map(command => runStep(path, command)),
]
