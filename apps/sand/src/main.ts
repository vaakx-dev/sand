#!/usr/bin/env bun
import type { CliValues } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { expandHome } from '@sand/kit/fs'
import { safeEnv, safeFromEnv } from '@sand/kit/host'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { run } from './app/run'
import { stop } from './daemon/stop'

const parsed = parseArgs({
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
    safe: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
  strict: false,
})

const values = parsed.values as CliValues
const text = (value: string | boolean | undefined) => (typeof value === 'string' ? value : undefined)
const on = (value: string | boolean | undefined) => (value === true ? true : undefined)
const [command, ...args] = parsed.positionals
if (typeof values.home === 'string') process.env.SAND_HOME = resolve(values.home)
const home = process.env.SAND_HOME ? expandHome(process.env.SAND_HOME) : join(homedir(), '.sand')
const cwd = text(values.cwd)
const flags = { continue: on(values.continue), resume: text(values.resume), model: text(values.model), effort: text(values.effort), fast: on(values.fast), cwd }
if (cwd) process.chdir(cwd)
const safe = values.safe === true || safeFromEnv()

const dispatch = async () => {
  if (values.help || command === 'help') return run({ mode: 'command', home, args: ['help'], flags, values, safe })
  if (typeof values.print === 'string') return run({ mode: 'print', home, args, flags, prompt: values.print, safe })
  if (command === 'serve') {
    if (safe) process.env[safeEnv] = '1'
    return (await import('./host/run')).runHost({ home })
  }
  if (command === 'runtime') return run({ mode: 'serve', home, args, flags, safe })
  if (command === 'stop') return stop(home)
  return run({ mode: 'command', home, args: [command ?? 'launch', ...args], flags, values, safe })
}

try {
  await dispatch()
} catch (error) {
  console.error(errorMessage(error))
  process.exit(1)
}
