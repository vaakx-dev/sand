#!/usr/bin/env bun
import { sandHome } from '@sand/host'
import { errorMessage } from '@sand/kit'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { run } from './app/run'
import { devices } from './commands/devices/devices'
import { launch } from './commands/launch/launch'
import { projects } from './commands/project'
import { remotes } from './commands/remotes'
import { usageReport } from './commands/usage'
import { stop } from './daemon/stop'
import { help } from './help'

const { values, positionals } = parseArgs({
  options: {
    print: { type: 'string', short: 'p' },
    continue: { type: 'boolean', short: 'c' },
    resume: { type: 'string', short: 'r' },
    model: { type: 'string' },
    effort: { type: 'string' },
    fast: { type: 'boolean' },
    on: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    path: { type: 'string' },
    all: { type: 'boolean' },
    setup: { type: 'boolean' },
    ours: { type: 'boolean' },
    theirs: { type: 'boolean' },
    cwd: { type: 'string' },
    home: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
})

const [command, ...args] = positionals
if (values.home) process.env.SAND_HOME = resolve(values.home)
const home = sandHome()
const { continue: latest, resume, model, effort, fast, on, cwd } = values
const projectFlags = { all: values.all, from: values.from, to: values.to, on, path: values.path, setup: values.setup, ours: values.ours, theirs: values.theirs }
const flags = { continue: latest, resume, model, effort, fast, cwd }
if (cwd) process.chdir(cwd)

const dispatch = async () => {
  if (values.help) return console.log(help)
  if (values.print) return run({ mode: 'print', home, args, flags, prompt: values.print })
  if (!command) return launch({ home, latest, session: resume })
  if (command === 'serve') return (await import('./host/run')).runHost({ home })
  if (command === 'runtime') return run({ mode: 'serve', home, args, flags })
  if (command === 'stop') return stop(home)
  if (command === 'devices') return devices(home, args)
  if (command === 'remote') return remotes(home, args)
  if (command === 'project') return projects(home, args, projectFlags)
  if (command === 'usage') return usageReport(home, args)
  if (command === 'install') return (await import('./commands/install')).installCommand(home, args)
  if (command === 'release-assets') return (await import('./commands/release-assets')).releaseAssets(args)
  console.error(`unknown command "${command}"\n${help}`)
  process.exit(2)
}

try {
  await dispatch()
} catch (error) {
  console.error(errorMessage(error))
  process.exit(1)
}
