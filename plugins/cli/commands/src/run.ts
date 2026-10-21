import { errorMessage } from '@sand/util'
import { parseArgs } from 'node:util'
import type { CliCommand, CliCommands } from './contract'
import { helpText } from './help'

const helpFlags = new Set(['--help', '-h'])

const pick = (commands: CliCommand[], [first]: string[]) => {
  if (first !== undefined && helpFlags.has(first)) return { name: 'help', rest: 1 }
  if (first === undefined || first.startsWith('-')) return { name: commands.find(command => command.default)?.name, rest: 0 }
  return { name: first, rest: 1 }
}

const parse = (command: CliCommand, args: string[]) => {
  const options = Object.fromEntries(Object.entries(command.options ?? {}).map(([name, { type, short }]) => [name, { type, short }]))
  return parseArgs({ args, options, allowPositionals: true })
}

export const runCommand = async (commands: CliCommands, args: string[]) => {
  const list = commands.list()
  const { name, rest } = pick(list, args)
  const command = list.find(candidate => candidate.name === name)
  if (!command) {
    console.error(`${name ? `unknown command "${name}"` : 'no command is the default'}\n${helpText(list)}`)
    return 2
  }
  try {
    const { values, positionals } = parse(command, args.slice(rest))
    return (await command.run(positionals, values)) ?? 0
  } catch (error) {
    console.error(errorMessage(error))
    return 1
  }
}
