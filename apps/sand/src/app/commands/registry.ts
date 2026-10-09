import type { CliCommand, CliCommands } from '@sand/protocol'

export const commandRegistry = (): CliCommands => {
  const commands = new Map<string, CliCommand>()
  return {
    register(command) {
      if (commands.has(command.name)) throw new Error(`the command "${command.name}" is already registered`)
      commands.set(command.name, command)
      return () => {
        if (commands.get(command.name) === command) commands.delete(command.name)
      }
    },
    list: () => [...commands.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}
