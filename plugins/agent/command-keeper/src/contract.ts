import { request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'
import type { OutputSnapshot } from './output'

export { Keeper } from './keeper'
export { outputTail, type OutputSnapshot, type OutputTail } from './output'

export interface CommandSpec {
  id: string
  command: string
  cwd: string
  conversation: string
  label: string
  origin?: string
}

export interface Launch extends CommandSpec {
  argv: string[]
  verbatim: boolean
}

export interface KeptCommand extends CommandSpec {
  pid: number
  started: number
  output: OutputSnapshot
  code?: number
}

export interface CommandHooks {
  started(command: KeptCommand): void
  output(id: string, text: string): void
  exit(id: string, code: number): void
}

export const launchInput = z.object({
  id: z.string().min(1),
  command: z.string(),
  cwd: z.string(),
  conversation: z.string(),
  label: z.string(),
  origin: z.string().optional(),
  argv: z.array(z.string()).min(1),
  verbatim: z.boolean(),
})

export const commandStart = request('shell.command.start', { input: () => launchInput, output: type<number>(), callers: 'runtime' })

export const commandsKept = request('shell.commands.kept', { input: () => z.object({}), output: type<KeptCommand[]>(), callers: 'runtime' })

export const commandStop = request('shell.command.stop', { input: () => z.object({ id: z.string() }), output: type<void>(), callers: 'runtime' })

export const commandStarted = wireEvent<KeptCommand>('shell.command.started')

export const commandOutput = wireEvent<{ id: string; text: string }>('shell.command.output')

export const commandExit = wireEvent<{ id: string; code: number }>('shell.command.exit')

export const commandsHeld = wireEvent<void>('shell.commands.held')
