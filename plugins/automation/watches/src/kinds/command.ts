import type { ShellRunner } from '@sand/shell/contract'
import { oneLine } from '@sand/util'
import { expandHome } from '@sand/util/fs'
import { homedir } from 'node:os'
import { z } from 'zod'
import type { Kind } from '../contract'
import { poll } from './poll'

const timeoutMs = 60_000
const shownLength = 2000
const keptLength = 20_000
const diffLines = 20

const input = z.object({
  command: z.string().min(1).describe('The shell command to run'),
  cwd: z.string().optional().describe('The folder to run it in; your home folder if left out'),
  every_minutes: z.number().int().min(1).default(5).describe('How often to run it, in minutes'),
})

const seenSchema = z.object({ hash: z.string(), code: z.number(), output: z.string() }).optional()

const lineDiff = (before: string, after: string) => {
  const old = new Set(before.split('\n'))
  const now = new Set(after.split('\n'))
  const removed = [...old].filter(line => !now.has(line)).map(line => `- ${line}`)
  const added = [...now].filter(line => !old.has(line)).map(line => `+ ${line}`)
  return [...removed, ...added].slice(0, diffLines).join('\n')
}

export const command = (runner: ShellRunner): Kind<typeof input> => ({
  name: 'command',
  label: 'Command',
  description: `Runs a shell command (${runner.name}) now and then, and notices when its output or exit code changes`,
  input,
  describe: ({ command }) => command,
  start({ command, cwd, every_minutes }, context) {
    poll(every_minutes, context, async () => {
      const outcome = await runner.run(command, { cwd: cwd ? expandHome(cwd) : homedir(), signal: context.signal, timeoutMs })
      if (outcome.timedOut) throw new Error(`${oneLine(command, 80)} ran longer than ${timeoutMs / 1000} s`)
      const output = [outcome.stdout, outcome.stderr].filter(Boolean).join('\n').replaceAll('\r\n', '\n').trimEnd()
      const hash = String(Bun.hash(`${outcome.code}\n${output}`))
      const seen = seenSchema.parse(context.state)
      if (seen?.hash === hash) return
      context.save({ hash, code: outcome.code, output: output.slice(0, keptLength) })
      if (!seen) return
      const exit = seen.code === outcome.code ? `Exit code ${outcome.code}` : `Exit code went from ${seen.code} to ${outcome.code}`
      const diff = lineDiff(seen.output, output.slice(0, keptLength))
      context.emit({
        at: Date.now(),
        from: command,
        summary: `The output of ${oneLine(command, 80)} changed`,
        detail: [exit, diff && `Changed lines:\n${diff}`, `Output now:\n${output.slice(0, shownLength)}`].filter(Boolean).join('\n\n'),
      })
    })
  },
})
